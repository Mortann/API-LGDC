CREATE DATABASE lgdc_bdd;
USE lgdc_bdd;

/* Organisation : Représente les différentes differntes organisation principales : 
    - Clan de la Rive
    - Faction de l'Ombre
    - Alliance de la Forêt

    Et les autres plus général : 

    - Chat Errant 
    - Chat Domestique
    - Autre 


Les Organisations principales seront lié a Empacement car elle controle des territoire précis. 



*/
CREATE TABLE Organisation(
    id_Organisation INT PRIMARY KEY NOT NULL AUTO_INCREMENT, 
    nom_Organisation VARCHAR(150) NOT NULL,
    logo_url VARCHAR(400) DEFAULT NULL,
    couleur_Zone VARCHAR(20) DEFAULT NULL,
    zone_x FLOAT DEFAULT NULL,
    zone_y FLOAT DEFAULT NULL,
    zone_w FLOAT DEFAULT NULL,
    zone_h FLOAT DEFAULT NULL,
    zone_points TEXT DEFAULT NULL
);


/*

Emplacement : Représente les differentes partie des territoires, pas forcement controlé par une organisation. 
Dans discord, chaque partie de territoire est un salon, donc par extention, chaque emplacement est un salon. 



*/
CREATE TABLE Emplacement(
    id_Emplacement INT PRIMARY KEY NOT NULL AUTO_INCREMENT, 
    nom_Emplacement VARCHAR(150) NOT NULL, 
    id_Organisation INT,
    id_SalonDiscord VARCHAR(20),
    pos_x FLOAT DEFAULT NULL,
    pos_y FLOAT DEFAULT NULL,
    
    FOREIGN KEY (id_Organisation) REFERENCES Organisation(id_Organisation)

);

/*
OC : représente le personnage fictif controlé par le joueur dans le RP. En plus de son nom et d'une PP (Photo de Profil), il a des statistiques propre a certaine caracteristique, qui vont etre utilse pour different systeme, comme pour le système de chasse. 



*/


CREATE TABLE OC(
    id_OC INT PRIMARY KEY NOT NULL AUTO_INCREMENT, 
    nom_OC VARCHAR(150) NOT NULL,
    pp_OC VARCHAR(400) NOT NULL,
    nv_Chasse INT NOT NULL, 
    nv_Combat INT NOT NULL, 
    nv_Vitesse INT NOT NULL, 
    nv_Endurance INT NOT NULL,
    nv_Memoire INT NOT NULL,
    nv_Intimidation INT NOT NULL,
    nbr_Prise_Jour INT NOT NULL, 
    nbr_Tentative INT NOT NULL,

    id_Organisation INT NOT NULL, 
    id_Emplacement INT NOT NULL, 

    FOREIGN KEY (id_Organisation) REFERENCES Organisation(id_Organisation),
    FOREIGN KEY (id_Emplacement) REFERENCES Emplacement(id_Emplacement)

 
);

/*
PNJ : Relativement meme cohse que l'OC



*/


CREATE TABLE PNJ(
    id_PNJ INT PRIMARY KEY NOT NULL AUTO_INCREMENT, 
    nom_PNJ VARCHAR(150) NOT NULL,
    pp_PNJ VARCHAR(400) NOT NULL,
    nv_Chasse INT NOT NULL, 
    nv_Combat INT NOT NULL, 
    nv_Vitesse INT NOT NULL, 
    nv_Endurance INT NOT NULL,
    nv_Memoire INT NOT NULL,
    nv_Intimidation INT NOT NULL,

    id_Organisation INT NOT NULL, 
    id_Emplacement INT NOT NULL,

    FOREIGN KEY (id_Organisation) REFERENCES Organisation(id_Organisation),
    FOREIGN KEY (id_Emplacement) REFERENCES Emplacement(id_Emplacement)
);


/*
Joueur : Représente le joueur, soit l'utilisateur discord


*/

CREATE TABLE Joueur (
    id_Utilisateur INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    id_UtilisateurDiscord VARCHAR(20) DEFAULT NULL,
    id_OC_1 INT NOT NULL, 
    id_OC_2 INT, 
    id_OC_3 INT,
    FOREIGN KEY (id_OC_1) REFERENCES OC(id_OC),
    FOREIGN KEY (id_OC_2) REFERENCES OC(id_OC),
    FOREIGN KEY (id_OC_3) REFERENCES OC(id_OC)
);


/*
Proie : Représente les proies avec des statistique qui leurs sont propores. 


*/

CREATE TABLE Proie(
    id_Proie INT PRIMARY KEY NOT NULL AUTO_INCREMENT, 
    nom_Proie VARCHAR(150) NOT NULL,
    pp_Proie VARCHAR(400) NOT NULL,
    nv_Vitesse INT NOT NULL, 
    nv_Endurance INT NOT NULL,
    nv_Rarete INT NOT NULL
);


/*
Temps : Parametre exterieurs qui modifie les conditions du monde. 
Par exemple nv_difficulte vas modifier la probabilité d'attraper une proie, comme si il faisait plus froid et que les proies sont moins nombreuses


*/

CREATE TABLE Temps(
    id_Temps INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    nv_difficulte INT NOT NULL
);


/*
SpawnProies : Permet de gerer le nombre de proies présente dans les territoire. 


*/
CREATE TABLE SpawnProies(

    id_Spawn INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    id_Proie INT NOT NULL,
    id_Emplacement INT NOT NULL, 
    nbr_Proie INT NOT NULL, 
    limite_Proie INT NOT NULL,    
    id_Temps INT NOT NULL,

    FOREIGN KEY (id_Proie) REFERENCES Proie(id_Proie),
    FOREIGN KEY (id_Emplacement) REFERENCES Emplacement(id_Emplacement),
    FOREIGN KEY (id_Temps) REFERENCES Temps(id_Temps)

);

/*

Message : Représente les message qui serons écrit pour differnets chose comme lorsqu'une personne cherche cette proies, qu'elle l'a trouvé et capturé, ou que c'est un echec.

*/

CREATE TABLE Message(
    id_Message INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    contenu_Message LONGTEXT NOT NULL, 
    type_Message ENUM('RECHERCHE', 'CAPTURE', 'ECHEC') NOT NULL
);

CREATE TABLE ListMessage(
    id_Proie INT NOT NULL,
    id_Message INT NOT NULL,
    PRIMARY KEY (id_Proie, id_Message),
    FOREIGN KEY (id_Proie) REFERENCES Proie(id_Proie),
    FOREIGN KEY (id_Message) REFERENCES Message(id_Message)
);


/*
StatistiquesJoueur : Stocke les statistiques détaillées de chaque joueur.
Permet de suivre l'activité, les performances de chasse, les déplacements, etc.
*/

CREATE TABLE StatistiquesJoueur(
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

/* Table pour suivre les captures par proie (pour stats détaillées) */
CREATE TABLE CapturesJoueur(
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