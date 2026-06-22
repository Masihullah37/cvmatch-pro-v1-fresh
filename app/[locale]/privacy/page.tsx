export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-700 leading-relaxed">
      <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">Politique de Confidentialité (RGPD)</h1>

      <p className="text-sm text-slate-500 mb-12 italic">Mise à jour le {new Date().toLocaleDateString('fr-FR')}</p>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">1. Introduction</h2>
        <p>
          La présente Politique de Confidentialité décrit comment <strong>RushAI</strong> ("nous", "notre", "nos") collecte, utilise et
          protège vos données personnelles lorsque vous utilisez la plateforme <strong>CVMatch Pro</strong>.
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">2. Données Collectées</h2>
        <p>Nous collectons les données suivantes nécessaires à la fourniture de nos services :</p>
        <ul className="list-disc pl-6 space-y-4">
          <li><strong>Informations de compte :</strong> Nom, adresse email via Clerk.</li>
          <li><strong>Contenu du CV :</strong> Le texte et les fichiers que vous importez pour analyse.</li>
          <li><strong>Informations de paiement :</strong> Gérées de manière sécurisée par Stripe (nous ne stockons pas vos coordonnées bancaires).</li>
          <li><strong>Données de navigation :</strong> Cookies techniques nécessaires au fonctionnement du site.</li>
        </ul>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">3. Utilisation de l'Intelligence Artificielle</h2>
        <p>
          Vos données de CV sont traitées par nos modèles d'IA pour générer des optimisations. Ces données ne sont pas utilisées
          pour entraîner des modèles tiers de manière publique. Elles sont traitées de manière éphémère pour produire votre analyse.
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">4. Vos Droits et la Gestion de Vos Données Personnelles</h2>
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez de plusieurs droits concernant vos données personnelles.</p>

        <h3 className="text-xl font-black text-slate-900 pl-4 uppercase tracking-tighter">Droit à l'Effacement (Droit à l'Oubli)</h3>
        <p>Vous avez le droit de demander l'effacement de vos données personnelles dans les meilleurs délais, et nous avons l'obligation de les effacer sans délai excessif lorsque l'un des motifs suivants s'applique :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Vos données ne sont plus nécessaires au regard des finalités pour lesquelles elles ont été collectées ou traitées.</li>
          <li>Vous retirez votre consentement sur lequel est fondé le traitement et il n'existe pas d'autre fondement juridique au traitement.</li>
          <li>Vous vous opposez au traitement et il n'existe pas de motif légitime impérieux pour le traitement.</li>
          <li>Vos données ont fait l'objet d'un traitement illicite.</li>
          <li>Vos données doivent être effacées pour respecter une obligation légale.</li>
        </ul>

        <h3 className="text-xl font-black text-slate-900 pl-4 uppercase tracking-tighter">Mise en œuvre du Droit à l'Effacement (Soft Delete et Suppression Définitive) :</h3>
        <p>Lorsque vous initiez une demande de suppression de votre compte utilisateur ou d'un document spécifique (tel qu'une analyse de CV) via notre plateforme, nous mettons en œuvre un processus de "suppression douce" (soft delete) :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Inaccessibilité Immédiate :</strong> Vos données sont immédiatement marquées comme "supprimées" dans nos systèmes. Elles deviennent alors **inaccessibles** depuis votre interface utilisateur et ne sont plus utilisées pour les opérations courantes de la plateforme.
          </li>
          <li>
            <strong>Période de Rétention de 30 Jours :</strong> Vos données sont conservées dans un environnement sécurisé pendant une période de **trente (30) jours** à compter de la date de votre demande de suppression. Cette période de rétention est mise en place pour des motifs légitimes et strictement définis :
            <ul className="list-circle pl-6 space-y-1 mt-1">
              <li>**Récupération Accidentelle :** Pour vous permettre de récupérer vos données en cas de suppression involontaire ou de changement d'avis durant cette période.</li>
              <li>**Obligations Légales et Audit :** Pour répondre à nos obligations légales de conservation de certaines traces (par exemple, transactions financières, journaux d'activité pour des raisons de sécurité ou de conformité réglementaire) et pour des besoins d'audit interne, notamment en cas de contrôle par la CNIL ou d'autres autorités compétentes.</li>
              <li>**Prévention de la Fraude :** Pour prévenir d'éventuelles activités frauduleuses ou abusives liées à l'utilisation de nos services.</li>
            </ul>
          </li>
          <li>
            <strong>Suppression Définitive et Irréversible :</strong> À l'issue de cette période de 30 jours, vos données personnelles sont **automatiquement et irréversiblement supprimées** de nos serveurs de production. Ce processus garantit que vos données ne peuvent plus être récupérées ou restaurées par nos services.
          </li>
        </ul>

        <h3 className="text-xl font-black text-slate-900 pl-4 uppercase tracking-tighter">Réinscription après Suppression :</h3>
        <p>Si vous choisissez de vous réinscrire à nos services avec la même adresse e-mail pendant la période de rétention de 30 jours suivant une suppression douce, veuillez noter que :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Création d'un Nouveau Compte :</strong> Votre réinscription entraînera la création d'un **nouveau compte utilisateur distinct**.
          </li>
          <li>
            <strong>Non-Restauration des Données Antérieures :</strong> Les données associées à votre précédent compte (soft-deleted) ne seront **pas restaurées ni liées** à votre nouveau compte. Votre nouveau compte fonctionnera comme un compte entièrement nouveau, sans historique de vos activités précédentes.
          </li>
        </ul>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">5. Partage des Données</h2>
        <p>
          Nous ne vendons jamais vos données à des tiers. Vos données sont partagées uniquement avec nos sous-traitants techniques
          essentiels (Vercel, Neon, Clerk, Stripe) dans le cadre strict du fonctionnement du service.
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">6. Vos Droits</h2>
        <p>
          Vous disposez d'un droit d'accès, de rectification, de portabilité et d'opposition au traitement de vos données.
          Pour toute demande, contactez-nous à : <strong>contact@rushai.pro</strong>.
        </p>
      </section>

    </div>
  );
}
