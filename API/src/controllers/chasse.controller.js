const db = require('../config/database');

/**
 * Calcule le taux de réussite de base en fonction du niveau de chasse de l'OC.
 * 
 * 10       → 95%
 * 8-9      → 80%
 * 5-7      → 60%
 * 2-4      → 50%
 * 0-1      → 1%
 */
function getTauxReussiteBase(nvChasse) {
    if (nvChasse >= 10) return 95;
    if (nvChasse >= 8) return 80;
    if (nvChasse >= 5) return 60;
    if (nvChasse >= 2) return 50;
    return 1;
}

/**
 * Applique les modificateurs au taux de réussite :
 * - Difficulté du temps (réduit le taux)
 * - Rareté de la proie (réduit le taux)
 * - Vitesse de la proie vs vitesse de l'OC
 */
function calculerTauxFinal(tauxBase, oc, proie, difficulteTemps) {
    let taux = tauxBase;

    // Modificateur de difficulté du temps (chaque point de difficulté retire 5%)
    taux -= (difficulteTemps || 0) * 5;

    // Modificateur de rareté de la proie (chaque point de rareté retire 3%)
    taux -= (proie.nv_Rarete || 0) * 3;

    // Modificateur de vitesse : si la proie est plus rapide que l'OC
    const diffVitesse = (proie.nv_Vitesse || 0) - (oc.nv_Vitesse || 0);
    if (diffVitesse > 0) {
        taux -= diffVitesse * 2;
    }

    // Le taux ne peut pas descendre sous 1% ni dépasser 99%
    return Math.max(1, Math.min(99, taux));
}

const MAX_PRISES_JOUR = 3;
const MAX_TENTATIVES = 6;

/**
 * POST /api/chasse/tenter
 * 
 * Body attendu :
 * {
 *   id_OC: number,          — l'OC qui chasse
 *   id_Proie: number,       — la proie choisie par le joueur
 *   id_Emplacement: number  — où se passe la chasse (optionnel, défaut = emplacement de l'OC)
 * }
 * 
 * Retourne :
 * {
 *   success: true,
 *   data: {
 *     resultat: 'CAPTURE' | 'ECHEC' | 'LIMITE_PRISES' | 'LIMITE_TENTATIVES',
 *     taux_reussite: number,
 *     message: string,
 *     oc: { nom_OC, nbr_Prise_Jour, nbr_Tentative },
 *     proie: { nom_Proie }
 *   }
 * }
 */
exports.tenterChasse = async (req, res, next) => {
    try {
        const { id_OC, id_Proie, id_Emplacement } = req.body;

        if (!id_OC || !id_Proie) {
            return res.status(400).json({
                success: false,
                message: 'Les champs id_OC et id_Proie sont requis.'
            });
        }

        // 1. Récupérer l'OC
        const [ocRows] = await db.query('SELECT * FROM OC WHERE id_OC = ?', [id_OC]);
        if (ocRows.length === 0) {
            return res.status(404).json({ success: false, message: 'OC non trouvé.' });
        }
        const oc = ocRows[0];

        // 2. Vérifier la limite de prises (3 par jour)
        if (oc.nbr_Prise_Jour >= MAX_PRISES_JOUR) {
            // Chercher un message personnalisé pour ce cas
            return res.json({
                success: true,
                data: {
                    resultat: 'LIMITE_PRISES',
                    taux_reussite: 0,
                    message: `${oc.nom_OC} a déjà rempli sa réserve de gibier pour aujourd'hui. Le Clan peut être fier !`,
                    oc: { nom_OC: oc.nom_OC, nbr_Prise_Jour: oc.nbr_Prise_Jour, nbr_Tentative: oc.nbr_Tentative },
                    proie: null
                }
            });
        }

        // 3. Vérifier la limite de tentatives
        if (oc.nbr_Tentative >= MAX_TENTATIVES) {
            return res.json({
                success: true,
                data: {
                    resultat: 'LIMITE_TENTATIVES',
                    taux_reussite: 0,
                    message: `Les ancêtres du Clan des Étoiles sont furieux ! ${oc.nom_OC} ferait mieux d'arrêter de chasser pour aujourd'hui...`,
                    oc: { nom_OC: oc.nom_OC, nbr_Prise_Jour: oc.nbr_Prise_Jour, nbr_Tentative: oc.nbr_Tentative },
                    proie: null
                }
            });
        }

        // 4. Récupérer la proie
        const [proieRows] = await db.query('SELECT * FROM Proie WHERE id_Proie = ?', [id_Proie]);
        if (proieRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Proie non trouvée.' });
        }
        const proie = proieRows[0];

        // 5. Récupérer la difficulté du temps actuel (via SpawnProies)
        const emplacementId = id_Emplacement || oc.id_Emplacement;
        let difficulteTemps = 0;
        const [spawnRows] = await db.query(`
            SELECT t.nv_difficulte, sp.nbr_Proie
            FROM SpawnProies sp
            JOIN Temps t ON sp.id_Temps = t.id_Temps
            WHERE sp.id_Proie = ? AND sp.id_Emplacement = ?
        `, [id_Proie, emplacementId]);

        if (spawnRows.length > 0) {
            difficulteTemps = spawnRows[0].nv_difficulte;

            // Vérifier qu'il reste des proies dans la zone
            if (spawnRows[0].nbr_Proie <= 0) {
                return res.json({
                    success: true,
                    data: {
                        resultat: 'ECHEC',
                        taux_reussite: 0,
                        message: `${oc.nom_OC} cherche un(e) ${proie.nom_Proie} mais il n'y en a plus dans cette zone...`,
                        oc: { nom_OC: oc.nom_OC, nbr_Prise_Jour: oc.nbr_Prise_Jour, nbr_Tentative: oc.nbr_Tentative },
                        proie: { nom_Proie: proie.nom_Proie }
                    }
                });
            }
        }

        // 6. Calculer le taux de réussite
        const tauxBase = getTauxReussiteBase(oc.nv_Chasse);
        const tauxFinal = calculerTauxFinal(tauxBase, oc, proie, difficulteTemps);

        // 7. Lancer le dé !
        const roll = Math.random() * 100;
        const reussite = roll < tauxFinal;

        // 8. Incrémenter les tentatives dans tous les cas
        await db.query(
            'UPDATE OC SET nbr_Tentative = nbr_Tentative + 1 WHERE id_OC = ?',
            [id_OC]
        );

        // 9. Récupérer un message personnalisé
        let messageRP = '';
        const typeMessage = reussite ? 'CAPTURE' : 'ECHEC';
        const [msgRows] = await db.query(`
            SELECT m.contenu_Message 
            FROM Message m
            JOIN ListMessage lm ON m.id_Message = lm.id_Message
            WHERE lm.id_Proie = ? AND m.type_Message = ?
            ORDER BY RAND()
            LIMIT 1
        `, [id_Proie, typeMessage]);

        if (msgRows.length > 0) {
            // Remplacer les placeholders dans le message
            messageRP = msgRows[0].contenu_Message
                .replace(/\{nom_OC\}/g, oc.nom_OC)
                .replace(/\{nom_Proie\}/g, proie.nom_Proie)
                .replace(/\{pp_OC\}/g, oc.pp_OC)
                .replace(/\{pp_Proie\}/g, proie.pp_Proie);
        } else {
            // Messages par défaut
            if (reussite) {
                messageRP = `${oc.nom_OC} bondit avec agilité et attrape un(e) ${proie.nom_Proie} ! Belle prise !`;
            } else {
                messageRP = `${oc.nom_OC} tente d'attraper un(e) ${proie.nom_Proie} mais la proie s'enfuit au dernier moment...`;
            }
        }

        if (reussite) {
            // 10a. Incrémenter le compteur de prises
            await db.query(
                'UPDATE OC SET nbr_Prise_Jour = nbr_Prise_Jour + 1 WHERE id_OC = ?',
                [id_OC]
            );

            // 10b. Réduire le spawn de cette proie dans la zone
            if (spawnRows.length > 0) {
                await db.query(
                    'UPDATE SpawnProies SET nbr_Proie = nbr_Proie - 1 WHERE id_Proie = ? AND id_Emplacement = ?',
                    [id_Proie, emplacementId]
                );
            }
        }

        // Récupérer l'OC mis à jour
        const [updatedOC] = await db.query('SELECT * FROM OC WHERE id_OC = ?', [id_OC]);

        res.json({
            success: true,
            data: {
                resultat: reussite ? 'CAPTURE' : 'ECHEC',
                taux_reussite: tauxFinal,
                jet: Math.round(roll * 100) / 100,
                message: messageRP,
                oc: {
                    nom_OC: updatedOC[0].nom_OC,
                    pp_OC: updatedOC[0].pp_OC,
                    nbr_Prise_Jour: updatedOC[0].nbr_Prise_Jour,
                    nbr_Tentative: updatedOC[0].nbr_Tentative,
                    prises_restantes: MAX_PRISES_JOUR - updatedOC[0].nbr_Prise_Jour,
                    tentatives_restantes: MAX_TENTATIVES - updatedOC[0].nbr_Tentative
                },
                proie: {
                    nom_Proie: proie.nom_Proie,
                    pp_Proie: proie.pp_Proie
                }
            }
        });

    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/chasse/proies-disponibles/:idEmplacement
 * Liste les proies disponibles dans un emplacement donné (pour que le joueur choisisse)
 */
exports.getProiesDisponibles = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT p.id_Proie, p.nom_Proie, p.pp_Proie, p.nv_Rarete, 
                   sp.nbr_Proie AS quantite_disponible
            FROM SpawnProies sp
            JOIN Proie p ON sp.id_Proie = p.id_Proie
            WHERE sp.id_Emplacement = ? AND sp.nbr_Proie > 0
        `, [req.params.idEmplacement]);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/chasse/stats/:idOC
 * Stats de chasse d'un OC (pour affichage dans le bot)
 */
exports.getStatsChasse = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM OC WHERE id_OC = ?', [req.params.idOC]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'OC non trouvé.' });
        }
        const oc = rows[0];

        res.json({
            success: true,
            data: {
                nom_OC: oc.nom_OC,
                pp_OC: oc.pp_OC,
                nv_Chasse: oc.nv_Chasse,
                taux_base: getTauxReussiteBase(oc.nv_Chasse),
                nbr_Prise_Jour: oc.nbr_Prise_Jour,
                nbr_Tentative: oc.nbr_Tentative,
                prises_restantes: MAX_PRISES_JOUR - oc.nbr_Prise_Jour,
                tentatives_restantes: MAX_TENTATIVES - oc.nbr_Tentative,
                peut_chasser: oc.nbr_Prise_Jour < MAX_PRISES_JOUR && oc.nbr_Tentative < MAX_TENTATIVES
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/chasse/simuler?id_OC=X&id_Proie=Y&id_Emplacement=Z
 * Simule une chasse sans la réaliser (pour preview du taux)
 */
exports.simuler = async (req, res, next) => {
    try {
        const { id_OC, id_Proie, id_Emplacement } = req.query;

        if (!id_OC || !id_Proie) {
            return res.status(400).json({ success: false, message: 'Les paramètres id_OC et id_Proie sont requis.' });
        }

        const [ocRows] = await db.query('SELECT * FROM OC WHERE id_OC = ?', [id_OC]);
        if (ocRows.length === 0) {
            return res.status(404).json({ success: false, message: 'OC non trouvé.' });
        }

        const [proieRows] = await db.query('SELECT * FROM Proie WHERE id_Proie = ?', [id_Proie]);
        if (proieRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Proie non trouvée.' });
        }

        const oc = ocRows[0];
        const proie = proieRows[0];
        const emplacementId = id_Emplacement || oc.id_Emplacement;

        let difficulteTemps = 0;
        const [spawnRows] = await db.query(`
            SELECT t.nv_difficulte
            FROM SpawnProies sp
            JOIN Temps t ON sp.id_Temps = t.id_Temps
            WHERE sp.id_Proie = ? AND sp.id_Emplacement = ?
        `, [id_Proie, emplacementId]);

        if (spawnRows.length > 0) {
            difficulteTemps = spawnRows[0].nv_difficulte;
        }

        const tauxBase = getTauxReussiteBase(oc.nv_Chasse);
        const tauxFinal = calculerTauxFinal(tauxBase, oc, proie, difficulteTemps);

        res.json({
            success: true,
            data: {
                oc: oc.nom_OC,
                proie: proie.nom_Proie,
                taux_base: tauxBase,
                taux_final: tauxFinal,
                modificateurs: {
                    difficulte_temps: difficulteTemps,
                    rarete_proie: proie.nv_Rarete,
                    diff_vitesse: Math.max(0, (proie.nv_Vitesse || 0) - (oc.nv_Vitesse || 0))
                }
            }
        });
    } catch (err) {
        next(err);
    }
};
