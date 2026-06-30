export default function ConditionsGeneralesPage() {

    const COMPANY_NAME = "YOUR_COMPANY_NAME";
    const LEGAL_FORM = "Entrepreneur individuel (régime micro-entrepreneur)";
    const COMPANY_ADDRESS = "2 Claude Chappe, 37300, Joué-lès-Tours, France";
    const SIREN = "";
    const SIRET = "";
    const VAT_NUMBER = "Non applicable - TVA non applicable, art. 293 B du CGI";
    const DIRECTOR_NAME = "";
    const WEBSITE_URL = "https://ouicv.fr";
    const EMAIL = "contact@ouicv.fr";

    return (
        <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-700 leading-relaxed">
            <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">
                Conditions Générales de Vente et d'Utilisation (CGVU)
            </h1>

            <p className="text-sm text-slate-500 mb-12 italic">
                Dernière mise à jour :{" "}
                {new Date().toLocaleDateString("fr-FR")}
            </p>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    1. Objet
                </h2>

                <p>
                    Les présentes Conditions Générales de Vente et
                    d'Utilisation (CGVU) définissent les droits et obligations
                    entre l'éditeur du site <strong>{WEBSITE_URL}</strong> et toute
                    personne utilisant la plateforme.
                </p>

                <p>
                    {WEBSITE_URL} est une plateforme SaaS permettant notamment
                    l'analyse de CV, leur optimisation à l'aide de
                    technologies d'intelligence artificielle, la génération de
                    nouvelles versions de CV ainsi que différents services
                    destinés à faciliter les démarches de recherche d'emploi.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    2. Éditeur du service
                </h2>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-2">
                    <p>
                        <strong>Société :</strong> {COMPANY_NAME}
                    </p>

                    <p>
                        <strong>Forme juridique :</strong> {LEGAL_FORM}
                    </p>

                    <p>
                        <strong>SIREN / SIRET :</strong> {SIRET}
                    </p>

                    <p>
                        <strong>TVA :</strong> TVA non applicable – article 293 B du Code général des impôts.
                    </p>

                    <p>
                        <strong>Adresse :</strong> {COMPANY_ADDRESS}
                    </p>

                    <p>
                        <strong>Email :</strong> contact@ouicv.fr
                    </p>

                    <p>
                        <strong>Directeur de publication :</strong> [Nom]
                    </p>
                </div>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    3. Création d'un compte
                </h2>

                <p>
                    L'utilisation de certaines fonctionnalités nécessite la
                    création d'un compte utilisateur via notre prestataire
                    d'authentification sécurisé.
                </p>

                <p>
                    L'utilisateur garantit l'exactitude des informations
                    communiquées lors de son inscription.
                </p>

                <p>
                    L'utilisateur est responsable de la confidentialité de ses
                    identifiants de connexion ainsi que de toutes les actions
                    réalisées depuis son compte.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    4. Description des services
                </h2>

                <p>La plateforme peut notamment proposer :</p>

                <ul className="list-disc pl-6 space-y-3">
                    <li>Analyse automatisée de CV.</li>

                    <li>Optimisation de CV grâce à l'intelligence artificielle.</li>

                    <li>Création de nouvelles versions de CV.</li>

                    <li>Analyse de descriptions d'offres d'emploi.</li>

                    <li>Comparaison entre un CV et une offre.</li>

                    <li>Système de crédits selon l'offre souscrite.</li>
                </ul>

                <p>
                    Les fonctionnalités peuvent évoluer sans préavis afin
                    d'améliorer le service.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    5. Offres, abonnements et crédits
                </h2>

                <p>
                    Certaines fonctionnalités sont accessibles via des crédits
                    ou un abonnement.
                </p>

                <ul className="list-disc pl-6 space-y-4">
                    <li>
                        Les crédits sont consommés lors de l'utilisation de
                        certaines fonctionnalités.
                    </li>

                    <li>
                        Les crédits offerts dans un abonnement sont valables
                        uniquement durant la période d'abonnement concernée.
                    </li>

                    <li>
                        Les crédits non utilisés à expiration ne sont pas
                        automatiquement reportés sauf mention contraire.
                    </li>

                    <li>
                        Les crédits issus d'un achat unique disposent de leur
                        propre durée de validité précisée lors de l'achat.
                    </li>
                </ul>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    6. Prix et paiement
                </h2>

                <p>
                    Les prix sont indiqués en euros (€). En tant qu'entrepreneur individuel bénéficiant de la franchise en base de TVA (article 293 B du CGI), la TVA n'est pas applicable.
                </p>

                <p>
                    Les paiements sont sécurisés et réalisés par notre
                    prestataire Stripe.
                </p>

                <p>
                    {WEBSITE_URL} ne stocke jamais les informations complètes de carte
                    bancaire.
                </p>

                <p>
                    Les factures sont mises à disposition conformément à la
                    réglementation applicable.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    7. Droit de rétractation
                </h2>

                <p>
                    Conformément à l'article L221-28 du Code de la
                    consommation, le droit de rétractation ne s'applique pas à
                    la fourniture d'un contenu numérique dont l'exécution a
                    commencé après accord préalable exprès du consommateur.
                </p>

                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
                    <p className="font-medium text-amber-900">
                        En utilisant immédiatement les crédits achetés ou en
                        lançant une première analyse, l'utilisateur demande
                        expressément le début immédiat de l'exécution du service
                        et reconnaît renoncer à son droit de rétractation dans
                        les conditions prévues par la loi.
                    </p>
                </div>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    8. Obligations de l'utilisateur
                </h2>

                <ul className="list-disc pl-6 space-y-3">
                    <li>Ne pas utiliser le service de manière frauduleuse.</li>

                    <li>Ne pas porter atteinte aux droits des tiers.</li>

                    <li>Ne pas tenter de contourner les limitations techniques.</li>

                    <li>
                        Ne pas utiliser la plateforme à des fins illicites.
                    </li>

                    <li>
                        Respecter les lois françaises et européennes.
                    </li>
                </ul>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    9. Propriété intellectuelle
                </h2>

                <p>
                    Tous les éléments composant {WEBSITE_URL} (logiciels, interface,
                    textes, logos, marques, illustrations, graphismes,
                    fonctionnalités et contenus) sont protégés par les lois
                    relatives à la propriété intellectuelle.
                </p>

                <p>
                    Toute reproduction ou utilisation sans autorisation écrite
                    est interdite.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    10. Protection des données personnelles
                </h2>

                <p>
                    Les traitements de données personnelles sont réalisés
                    conformément au Règlement Général sur la Protection des
                    Données (RGPD) ainsi qu'à la loi Informatique et Libertés.
                </p>

                <p>
                    Les modalités complètes de traitement sont détaillées dans
                    notre Politique de Confidentialité.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    11. Disponibilité du service
                </h2>

                <p>
                    {WEBSITE_URL} met en œuvre tous les moyens raisonnables pour
                    assurer la disponibilité du service.
                </p>

                <p>
                    Des interruptions temporaires peuvent toutefois intervenir
                    pour maintenance, évolution technique ou cas de force
                    majeure.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    12. Responsabilité
                </h2>

                <p>
                    Les analyses produites par l'intelligence artificielle sont
                    fournies à titre d'assistance.
                </p>

                <p>
                    L'utilisateur demeure seul responsable du contenu final de
                    son CV ainsi que des documents transmis à des employeurs.
                </p>

                <p>
                    {WEBSITE_URL} ne garantit pas l'obtention d'un entretien
                    d'embauche ou d'un emploi.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    13. Résiliation
                </h2>

                <p>
                    L'utilisateur peut supprimer son compte à tout moment
                    depuis son espace personnel.
                </p>

                <p>
                    Les données sont ensuite conservées pendant une durée
                    maximale de 30 jours avant suppression définitive,
                    conformément à notre Politique de Confidentialité.
                </p>

                <p>
                    L'éditeur peut suspendre ou supprimer un compte en cas de
                    violation des présentes CGVU.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    14. Modification des CGVU
                </h2>

                <p>
                    Les présentes CGVU peuvent être modifiées à tout moment
                    afin de tenir compte d'évolutions légales, réglementaires
                    ou techniques.
                </p>

                <p>
                    La version applicable est celle publiée sur le site à la
                    date de consultation.
                </p>
            </section>

            {/* ------------------------------------------------------- */}

            <section className="space-y-6">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    15. Droit applicable
                </h2>

                <p>
                    Les présentes CGVU sont régies par le droit français.
                </p>

                <p>
                    En cas de litige, les parties rechercheront une solution
                    amiable avant toute procédure judiciaire.
                </p>

                <p>
                    À défaut d'accord amiable, les juridictions françaises
                    seront compétentes conformément aux dispositions légales
                    applicables.
                </p>
            </section>
        </div>
    );
}