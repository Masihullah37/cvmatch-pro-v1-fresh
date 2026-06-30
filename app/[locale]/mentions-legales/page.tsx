export default function LegalNoticePage() {

  const COMPANY_NAME = "YOUR_COMPANY_NAME";
  const LEGAL_FORM = "Entrepreneur individuel (régime micro-entrepreneur)";
  const COMPANY_ADDRESS = "YOUR_COMPANY_ADDRESS";
  const SIREN = "YOUR_SIREN";
  const SIRET = "YOUR_SIRET";
  const VAT_NUMBER = "Non applicable - TVA non applicable, art. 293 B du CGI";
  const DIRECTOR_NAME = "YOUR_NAME";
  const WEBSITE_URL = "https://ouicv.fr";
  const EMAIL = "contact@ouicv.fr"
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-700 leading-relaxed">

      <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">
        Mentions Légales
      </h1>

      <p className="text-sm text-slate-500 mb-12 italic">
        En vigueur au {new Date().toLocaleDateString('fr-FR')}
      </p>

      {/* ====================================================== */}
      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          1. Éditeur du Site
        </h2>

        <p>
          Le site <strong>{WEBSITE_URL}</strong>, accessible à l'adresse
          <strong> https://ouicv.fr</strong>, est édité par :
        </p>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-2">
          <p>
            <strong>Société :</strong> {COMPANY_NAME}
          </p>

          <p>
            <strong>Forme juridique :</strong> Entrepreneur individuel (Micro-entrepreneur)
          </p>

          <p>
            <strong>SIREN :</strong> {SIREN}
          </p>

          <p>
            <strong>SIRET :</strong> {SIRET}
          </p>

          <p>
            <strong>TVA :</strong> Non applicable – article 293 B du CGI
          </p>

          <p>
            <strong>Adresse de l'entreprise :</strong> {COMPANY_ADDRESS}
          </p>

          <p>
            <strong>Email :</strong> {EMAIL}
          </p>

          <p>
            <strong>Directeur de la publication :</strong> {DIRECTOR_NAME}
          </p>
        </div>
      </section>

      {/* ====================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          2. Hébergement
        </h2>

        <p>
          L'infrastructure technique de {WEBSITE_URL}  repose sur plusieurs prestataires
          spécialisés afin d'assurer la disponibilité, la sécurité et les
          performances du service.
        </p>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">

          <ul className="list-disc pl-6 space-y-3">

            <li>
              <strong>Hébergement de l'application :</strong> Railway
            </li>

            <li>
              <strong>Base de données :</strong> Neon
            </li>

            <li>
              <strong>Authentification des utilisateurs :</strong> Clerk
            </li>

            <li>
              <strong>Paiements sécurisés :</strong> Stripe
            </li>

            <li>
              <strong>Traitement IA :</strong> Groq
            </li>

            <li>
              <strong>Stockage de fichiers :</strong> UploadThing
            </li>

            <li>
              <strong>Cache & limitation de débit :</strong> Redis
            </li>

          </ul>

        </div>

      </section>

      {/* ====================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          3. Propriété intellectuelle
        </h2>

        <p>
          L'ensemble du contenu présent sur le site {WEBSITE_URL}, incluant notamment les
          textes, graphismes, logos, illustrations, logiciels, éléments visuels,
          bases de données, interfaces et leur organisation, est protégé par le
          Code de la propriété intellectuelle ainsi que par les conventions
          internationales applicables.
        </p>

        <p>
          Toute reproduction, représentation, adaptation, diffusion ou
          exploitation, totale ou partielle, sans autorisation écrite préalable
          de l'éditeur est strictement interdite et pourra donner lieu à des
          poursuites judiciaires.
        </p>

      </section>

      {/* ====================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          4. Responsabilité
        </h2>

        <p>
          {WEBSITE_URL} met tout en œuvre afin d'assurer l'exactitude des informations
          diffusées sur le site. Toutefois, aucune garantie n'est donnée quant à
          l'absence d'erreurs, d'omissions ou d'indisponibilités temporaires.
        </p>

        <p>
          Les résultats générés par les fonctionnalités d'intelligence
          artificielle constituent une aide à la rédaction et ne sauraient être
          considérés comme des conseils professionnels ou des garanties
          d'embauche.
        </p>

        <p>
          L'utilisateur demeure seul responsable de la vérification et de
          l'utilisation des contenus générés.
        </p>

      </section>

      {/* ====================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          5. Protection des données personnelles
        </h2>

        <p>
          Les traitements de données personnelles réalisés dans le cadre de
          {WEBSITE_URL} sont conformes au Règlement (UE) 2016/679 (RGPD) ainsi qu'à la
          loi Informatique et Libertés modifiée.
        </p>

        <p>
          Pour connaître les modalités de collecte, d'utilisation, de
          conservation et de suppression des données personnelles, veuillez
          consulter notre Politique de Confidentialité.
        </p>

      </section>

      {/* ====================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          6. Cookies
        </h2>

        <p>
          {WEBSITE_URL} utilise uniquement les cookies strictement nécessaires au bon
          fonctionnement du service sans consentement préalable.
        </p>

        <p>
          Les cookies de mesure d'audience Google Analytics sont déposés
          uniquement après acceptation explicite du bandeau de consentement,
          conformément aux recommandations de la CNIL.
        </p>

      </section>

      {/* ====================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          7. Droit applicable
        </h2>

        <p>
          Les présentes mentions légales sont soumises au droit français.
        </p>

        <p>
          En cas de litige et à défaut de résolution amiable, les juridictions
          françaises seront seules compétentes, sauf disposition légale
          impérative contraire.
        </p>

      </section>

      {/* ====================================================== */}

      <section className="space-y-6">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          8. Contact
        </h2>

        <p>
          Pour toute question concernant le site, vos données personnelles ou
          l'exercice de vos droits, vous pouvez nous contacter à :
        </p>

        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6">

          <p>
            <strong>Email :</strong> {EMAIL}
          </p>

        </div>

      </section>

    </div>
  );
}
