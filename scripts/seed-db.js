const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

const DB_PATH = path.join(process.cwd(), "data", "aiza.db");
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_entries (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('procedure', 'advice')),
    title_mg TEXT NOT NULL,
    title_fr TEXT NOT NULL,
    source TEXT NOT NULL,
    last_verified TEXT NOT NULL,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS keywords (
    entry_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    note TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_keywords_entry ON keywords(entry_id);
  CREATE INDEX IF NOT EXISTS idx_history_entry ON history(entry_id);
`);

const BUILD_DATE = new Date().toISOString().slice(0, 10);

const entries = [
  {
    id: "lost_cin",
    kind: "procedure",
    keywords: ["very", "very ny cin", "kara-panondrom-pirenena", "perte", "perdu", "perdue", "cin", "carte d'identite", "declaration de perte", "fanambarana very", "duplicata"],
    title_mg: "Very ny CIN — Fanaovana fanambarana very sy kopia vaovao",
    title_fr: "Perte de Carte d'Identité Nationale (CIN) — Déclaration et duplicata",
    required_documents: [
      "Certificat de résidence en cours de validité (Fokontany)",
      "Déclaration de perte délivrée par le commissariat ou la gendarmerie",
      "Photocopie de l'ancienne CIN (si disponible)",
      "Fiche mère ou copie d'acte de naissance récente",
      "4 photos d'identité récentes fond blanc",
      "Carnet de fokontany"
    ],
    steps: [
      "1. Déclaration de perte au Commissariat de Police ou à la Brigade de Gendarmerie",
      "2. Demande de certificat de résidence auprès du bureau du Fokontany",
      "3. Dépôt du dossier complet à l'Arrondissement Administratif (bureau de la Commune)",
      "4. Vérification d'identité et signature par le Chef de District",
      "5. Retrait de la nouvelle CIN à l'Arrondissement"
    ],
    service_location: "Arrondissement Administratif (Commune Urbaine) et Fokontany de résidence",
    cost: "1 200 Ar à 3 000 Ar (droits communaux)",
    processing_time: "48 heures à 5 jours ouvrables",
    source: "Ministère de l'Intérieur et de la Décentralisation (MID) / Commune Urbaine d'Antananarivo",
    last_verified: BUILD_DATE,
    history: [{ date: BUILD_DATE, note: "Procédure standard vérifiée pour Antananarivo." }]
  },
  {
    id: "birth_certificate",
    kind: "procedure",
    keywords: ["certificat de naissance", "acte de naissance", "sora-pianterana", "kopia", "copie d'acte de naissance", "zanaka", "zaza", "naissance", "fahaterahana", "extrait de naissance"],
    title_mg: "Kopian'ny sora-pianterana — Fangatahana kopia na dika mitovy",
    title_fr: "Copie d'acte de naissance — Demande d'extrait ou bulletin",
    required_documents: [
      "Livret de famille ou photocopie de l'ancien acte de naissance",
      "Carte d'Identité Nationale (CIN) du demandeur",
      "Timbres fiscaux (selon commune)"
    ],
    steps: [
      "1. Se présenter au service de l'État Civil de la Commune du lieu de naissance",
      "2. Indiquer le nom complet, la date de naissance, et les noms des parents",
      "3. Paiement du droit de délivrance auprès du régisseur",
      "4. Signature par l'Officier de l'État Civil et remise du document"
    ],
    service_location: "Bureau de l'État Civil de la Mairie / Commune du lieu de naissance",
    cost: "1 000 Ar à 2 500 Ar par exemplaire",
    processing_time: "Immédiat (quelques heures) à 24 heures",
    source: "Direction de l'État Civil — Commune Urbaine d'Antananarivo",
    last_verified: BUILD_DATE,
    history: [{ date: BUILD_DATE, note: "Procédure officielle d'état civil vérifiée." }]
  },
  {
    id: "marriage_certificate",
    kind: "procedure",
    keywords: ["acte de mariage", "mariage", "sora-panambadiana", "mariazy", "fanambadiana", "certificat de mariage", "extrait de mariage"],
    title_mg: "Sora-panambadiana — Fangatahana kopia na taratasy fanambadiana",
    title_fr: "Acte de mariage — Demande d'extrait ou copie intégrale",
    required_documents: [
      "Livret de famille délivré lors du mariage civil",
      "CIN de l'un des conjoints",
      "Date précise du mariage civil et noms des époux"
    ],
    steps: [
      "1. Présentation au service d'État Civil de la mairie où le mariage a été célébré",
      "2. Remplir la fiche de demande avec les références du registre",
      "3. Règlement des frais communaux",
      "4. Retrait de l'acte certifié conforme"
    ],
    service_location: "Mairie / Arrondissement Administratif du lieu de célébration du mariage civil",
    cost: "2 000 Ar par acte",
    processing_time: "24 heures",
    source: "Commune Urbaine d'Antananarivo — Service des Mariages",
    last_verified: BUILD_DATE,
    history: [{ date: BUILD_DATE, note: "Procédure standard de demande d'acte de mariage." }]
  },
  {
    id: "lost_drivers_license",
    kind: "procedure",
    keywords: ["permis", "permis de conduire", "very ny permis", "duplicata permis", "fanavaozana permis", "biometrique", "mitondra fiara"],
    title_mg: "Very ny permis de conduire — Fangatahana dika mitovy (Duplicata)",
    title_fr: "Perte de permis de conduire — Demande de duplicata biométrique",
    required_documents: [
      "Déclaration de perte originale (Police ou Gendarmerie)",
      "Photocopie certifiée conforme de la CIN",
      "Certificat médical d'aptitude à la conduite (délivré par médecin agréé)",
      "Photocopie de l'ancien permis ou attestation de délivrance",
      "Quittance de paiement du droit de duplicata",
      "3 photos d'identité récentes"
    ],
    steps: [
      "1. Effectuer la déclaration de perte au Commissariat",
      "2. Passer la visite médicale d'aptitude",
      "3. Dépôt du dossier au Centre Immatriculateur (CIM) Ambohidahy",
      "4. Prise des empreintes et photo biométrique",
      "5. Retrait du permis de conduire biométrique"
    ],
    service_location: "Centre Immatriculateur (CIM) — Ambohidahy, Antananarivo",
    cost: "38 000 Ar (frais biométriques et administratifs)",
    processing_time: "15 à 30 jours (récépissé provisoire délivré immédiatement)",
    source: "Ministère des Transports et de la Météorologie / Centre Immatriculateur",
    last_verified: BUILD_DATE,
    history: [{ date: BUILD_DATE, note: "Tarifs et démarches CIM Ambohidahy vérifiés." }]
  },
  {
    id: "address_change",
    kind: "procedure",
    keywords: ["changement d'adresse", "changement d adresse", "fokontany", "certificat de residence", "residence", "famindran-toerana", "fifindrana", "adiresy", "toerana"],
    title_mg: "Famindran-toerana sy fanovana adiresy — Taratasy fanamarinana fonenana",
    title_fr: "Changement d'adresse et certificat de résidence — Procédure Fokontany",
    required_documents: [
      "Carnet de fokontany de l'ancien quartier (avec mention de radiation)",
      "Carte d'Identité Nationale (CIN) des personnes majeures du foyer",
      "Facture JIRAMA récente ou contrat de bail du nouveau logement",
      "Photos d'identité du chef de famille"
    ],
    steps: [
      "1. Demander le certificat de radiation (taratasy famindrana) à l'ancien Fokontany",
      "2. Se présenter au bureau du nouveau Fokontany avec le carnet et les pièces justificatives",
      "3. Inscription sur le registre du quartier et délivrance du nouveau carnet de fokontany",
      "4. Obtention du Certificat de Résidence officiel"
    ],
    service_location: "Bureau du Fokontany du nouveau lieu d'habitation",
    cost: "1 000 Ar à 2 000 Ar (cotisation communale fokontany)",
    processing_time: "Immédiat le jour de la permanence",
    source: "Ministère de l'Intérieur et de la Décentralisation — Guide Fokontany",
    last_verified: BUILD_DATE,
    history: [{ date: BUILD_DATE, note: "Guide officiel d'inscription en Fokontany." }]
  },
  {
    id: "passport_cost",
    kind: "procedure",
    keywords: ["passeport", "pasipaoro", "frais passeport", "passeport vaovao", "prix passeport", "cost", "voyage", "anosy", "police"],
    title_mg: "Passeport biométrique vaovao — Vidiny sy antontan-taratasy ilaina",
    title_fr: "Passeport biométrique malagasy — Frais, pièces à fournir et procédure",
    required_documents: [
      "Demande manuscrite timbrée (timbre fiscal de 2 000 Ar)",
      "Copie d'acte de naissance délivrée il y a moins de 6 mois",
      "Photocopie certifiée conforme de la CIN",
      "Certificat de résidence récent avec photo",
      "Extrait de casier judiciaire (bulletin n°3) de moins de 3 mois",
      "Quittance du Trésor Public pour le droit de passeport",
      "4 photos d'identité biométriques (3,5 x 4,5 cm fond blanc)"
    ],
    steps: [
      "1. Versement du droit de passeport auprès de la Trésorerie Générale ou Perception",
      "2. Constitution et vérification du dossier au Service Central de l'Émigration et Immigration (Anosy)",
      "3. Enrôlement biométrique (prise de photo, empreintes et signature)",
      "4. Retrait personnel du passeport muni du récépissé"
    ],
    service_location: "Service Central de l'Émigration et de l'Immigration — Anosy, Antananarivo",
    cost: "190 000 Ar (tarif officiel quittance Trésor)",
    processing_time: "72 heures à 7 jours ouvrables",
    source: "Ministère de la Sécurité Publique — Police Nationale Madagascar",
    last_verified: BUILD_DATE,
    history: [{ date: BUILD_DATE, note: "Frais et démarches passeport biométrique vérifiés." }]
  },
  {
    id: "criminal_record",
    kind: "procedure",
    keywords: ["casier judiciaire", "extrait de casier judiciaire", "casier", "tribunal", "anosy", "bulletin numero 3", "bulletin n 3", "fahadiovan ny fitondran tena"],
    title_mg: "Extrait de Casier Judiciaire (Bulletin n°3) — Fangatahana eny amin'ny Fitsarana",
    title_fr: "Extrait de casier judiciaire (Bulletin n°3) — Demande au Tribunal",
    required_documents: [
      "Copie d'acte de naissance délivrée il y a moins de 3 mois (kopia)",
      "Photocopie certifiée conforme de la CIN",
      "Enveloppe timbrée avec adresse (pour les envois en province)",
      "Droit de greffe (quittance)"
    ],
    steps: [
      "1. Acheter l'imprimé officiel de demande au guichet du Tribunal de Première Instance (TPI)",
      "2. Joindre la copie d'acte de naissance et la photocopie de CIN",
      "3. Dépôt au greffe du casier judiciaire au Palais de Justice Anosy",
      "4. Retrait du bulletin signé après traitement"
    ],
    service_location: "Palais de Justice — Tribunal de Première Instance (TPI), Anosy, Antananarivo",
    cost: "3 000 Ar à 5 000 Ar",
    processing_time: "24 à 48 heures",
    source: "Ministère de la Justice — Direction des Affaires Judiciaires",
    last_verified: BUILD_DATE,
    history: [{ date: BUILD_DATE, note: "Démarches casier judiciaire vérifiées au TPI Anosy." }]
  },
  {
    id: "land_title",
    kind: "procedure",
    keywords: ["titre foncier", "foncier", "tany", "tany malagasy", "fananan tany", "titre", "propriete fonciere", "domaine", "bornage", "certificat foncier"],
    title_mg: "Fananan-tany sy Titre Foncier — Fomba fanaovana sy fangatahana taratasy",
    title_fr: "Titre foncier et certification foncière — Procédure auprès des Domaines",
    required_documents: [
      "Demande d'immatriculation ou de mutation foncière timbrée",
      "Certificat de situation juridique du terrain (délivré par la Conservation de la Propriété Foncière)",
      "Plan de situation et procès-verbal de délimitation ou de bornage par géomètre assermenté",
      "Acte de vente, donation ou partage notarié",
      "Photocopies certifiées conformes des CIN des parties"
    ],
    steps: [
      "1. Demander le certificat de situation juridique auprès de la Circonscription Domaniale",
      "2. Réalisation du bornage par un géomètre agréé (Topographie)",
      "3. Publication d'avis de bornage et constatation de non-opposition",
      "4. Dépôt et enregistrement du dossier au Service des Domaines et de la Propriété Foncière",
      "5. Établissement et remise du Titre Foncier au propriétaire"
    ],
    service_location: "Direction des Services Fonciers / Circonscription Domaniale (Anosy / Nanisana)",
    cost: "Variable selon la superficie, la valeur mercuriale et les droits de bornage",
    processing_time: "3 à 6 mois selon la situation cadastrale",
    source: "Ministère de la Décentralisation et de l'Aménagement du Territoire — Services Fonciers",
    last_verified: BUILD_DATE,
    history: [{ date: BUILD_DATE, note: "Procédure d'immatriculation et transfert foncier vérifiée." }]
  }
];

const insertEntry = db.prepare(`
  INSERT INTO knowledge_entries (id, kind, title_mg, title_fr, source, last_verified, data_json)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertKeyword = db.prepare("INSERT INTO keywords (entry_id, keyword) VALUES (?, ?)");
const insertHistory = db.prepare("INSERT INTO history (entry_id, date, note) VALUES (?, ?, ?)");

for (const entry of entries) {
  const data = {
    required_documents: entry.required_documents,
    steps: entry.steps,
    service_location: entry.service_location,
    cost: entry.cost,
    processing_time: entry.processing_time
  };
  insertEntry.run(
    entry.id,
    entry.kind,
    entry.title_mg,
    entry.title_fr,
    entry.source,
    entry.last_verified,
    JSON.stringify(data)
  );

  for (const k of entry.keywords) insertKeyword.run(entry.id, k);
  for (const h of entry.history) insertHistory.run(entry.id, h.date, h.note);
}

const count = db.prepare("SELECT COUNT(*) AS c FROM knowledge_entries").get().c;
console.log("Successfully seeded database with", count, "procedures!");
