-- Migration: Add zone_points to Organisation, create StatistiquesJoueur and CapturesJoueur tables
-- Run this on an existing lgdc_bdd database

USE lgdc_bdd;

-- 1. Add zone_points column to Organisation
ALTER TABLE Organisation ADD COLUMN zone_points TEXT DEFAULT NULL;

-- 2. Create StatistiquesJoueur table
CREATE TABLE IF NOT EXISTS StatistiquesJoueur(
    id_Stat INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    id_UtilisateurDiscord VARCHAR(20) NOT NULL UNIQUE,
    
    -- Activité générale
    nbr_messages_total INT NOT NULL DEFAULT 0,
    nbr_messages_aujourd_hui INT NOT NULL DEFAULT 0,
    nbr_commandes_total INT NOT NULL DEFAULT 0,
    nbr_jours_actifs INT NOT NULL DEFAULT 0,
    
    -- Chasse
    nbr_chasses_total INT NOT NULL DEFAULT 0,
    nbr_captures_total INT NOT NULL DEFAULT 0,
    nbr_echecs_chasse_total INT NOT NULL DEFAULT 0,
    nbr_chasses_aujourd_hui INT NOT NULL DEFAULT 0,
    nbr_captures_aujourd_hui INT NOT NULL DEFAULT 0,
    meilleur_serie_captures INT NOT NULL DEFAULT 0,
    serie_captures_actuelle INT NOT NULL DEFAULT 0,
    
    -- Déplacements
    nbr_deplacements_total INT NOT NULL DEFAULT 0,
    nbr_deplacements_aujourd_hui INT NOT NULL DEFAULT 0,
    
    -- Proies
    proie_la_plus_capturee_id INT DEFAULT NULL,
    proie_la_plus_capturee_nbr INT NOT NULL DEFAULT 0,
    
    -- Dates
    date_premiere_activite DATETIME DEFAULT NULL,
    date_derniere_activite DATETIME DEFAULT NULL,
    date_derniere_chasse DATETIME DEFAULT NULL,
    date_derniere_capture DATETIME DEFAULT NULL,
    
    -- Divers
    nbr_ocs INT NOT NULL DEFAULT 0,
    
    FOREIGN KEY (proie_la_plus_capturee_id) REFERENCES Proie(id_Proie)
);

-- 3. Create CapturesJoueur table
CREATE TABLE IF NOT EXISTS CapturesJoueur(
    id_Capture INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    id_UtilisateurDiscord VARCHAR(20) NOT NULL,
    id_Proie INT NOT NULL,
    id_OC INT NOT NULL,
    id_Emplacement INT NOT NULL,
    date_capture DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    taux_reussite FLOAT DEFAULT NULL,
    
    FOREIGN KEY (id_Proie) REFERENCES Proie(id_Proie),
    FOREIGN KEY (id_OC) REFERENCES OC(id_OC),
    FOREIGN KEY (id_Emplacement) REFERENCES Emplacement(id_Emplacement)
);

SELECT 'Migration terminée avec succès !' AS status;
