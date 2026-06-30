export default function CookiePolicyPage() {

    const WEBSITE_URL = "https://ouicv.fr";

    return (
        <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-700 leading-relaxed">
            <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">
                Politique de Cookies
            </h1>

            <p className="text-sm text-slate-500 mb-12 italic">
                Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
            </p>

            {/* ------------------------------------------------ */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    1. Qu'est-ce qu'un cookie ?
                </h2>

                <p>
                    Un cookie est un petit fichier texte enregistré sur votre
                    appareil (ordinateur, tablette ou smartphone) lorsque vous
                    consultez un site internet.
                </p>

                <p>
                    Les cookies permettent notamment d'assurer le bon
                    fonctionnement du site, de mémoriser certaines préférences,
                    d'améliorer votre expérience utilisateur et, lorsque vous y
                    consentez, de mesurer l'audience du site.
                </p>
            </section>

            {/* ------------------------------------------------ */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    2. Responsable du traitement
                </h2>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-2">
                    <p>
                        <strong>Société :</strong> [COMPANY NAME]
                    </p>

                    <p>
                        <strong>Adresse :</strong> [COMPANY ADDRESS]
                    </p>

                    <p>
                        <strong>SIRET :</strong> [SIRET]
                    </p>

                    <p>
                        <strong>Email :</strong> contact@ouicv.fr
                    </p>
                </div>
            </section>

            {/* ------------------------------------------------ */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    3. Les cookies utilisés sur {WEBSITE_URL}
                </h2>

                <p>
                    {WEBSITE_URL} utilise plusieurs catégories de cookies afin de fournir
                    ses services.
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full border border-slate-200 rounded-xl overflow-hidden text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="text-left p-4">Catégorie</th>
                                <th className="text-left p-4">Finalité</th>
                                <th className="text-left p-4">Consentement</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr className="border-t">
                                <td className="p-4 font-semibold">
                                    Cookies strictement nécessaires
                                </td>

                                <td className="p-4">
                                    Fonctionnement du site, sécurité, authentification,
                                    session utilisateur.
                                </td>

                                <td className="p-4">
                                    Non
                                </td>
                            </tr>

                            <tr className="border-t">
                                <td className="p-4 font-semibold">
                                    Cookies de préférence
                                </td>

                                <td className="p-4">
                                    Sauvegarde de certains choix utilisateur (exemple :
                                    langue).
                                </td>

                                <td className="p-4">
                                    Non
                                </td>
                            </tr>

                            <tr className="border-t">
                                <td className="p-4 font-semibold">
                                    Cookies statistiques
                                </td>

                                <td className="p-4">
                                    Mesure d'audience via Google Analytics.
                                </td>

                                <td className="p-4 font-bold text-emerald-600">
                                    Oui
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ------------------------------------------------ */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    4. Google Analytics
                </h2>

                <p>
                    Google Analytics est utilisé uniquement après votre
                    consentement explicite.
                </p>

                <p>
                    Cet outil permet de mesurer la fréquentation du site afin
                    d'améliorer les performances, l'expérience utilisateur et les
                    fonctionnalités proposées.
                </p>

                <p>
                    Les données collectées peuvent notamment inclure :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                    <li>Pages consultées</li>
                    <li>Durée de visite</li>
                    <li>Type d'appareil</li>
                    <li>Navigateur</li>
                    <li>Pays approximatif</li>
                    <li>Source de trafic</li>
                </ul>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
                    <p className="font-medium text-blue-900">
                        Aucun cookie Google Analytics n'est déposé tant que vous
                        n'avez pas accepté les cookies statistiques.
                    </p>
                </div>
            </section>

            {/* ------------------------------------------------ */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    5. Durée de conservation du consentement
                </h2>

                <p>
                    Conformément aux recommandations de la CNIL, votre choix
                    concernant les cookies est conservé pendant une durée maximale
                    de <strong>6 mois</strong>.
                </p>

                <p>
                    À l'issue de cette période, votre consentement vous sera de
                    nouveau demandé.
                </p>
            </section>

            {/* ------------------------------------------------ */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    6. Gestion des cookies
                </h2>

                <p>
                    Lors de votre première visite sur {WEBSITE_URL}, un bandeau vous
                    permet :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                    <li>D'accepter tous les cookies.</li>

                    <li>De les refuser.</li>

                    <li>De personnaliser votre choix.</li>
                </ul>

                <p>
                    Vous pouvez également modifier votre choix à tout moment via
                    les paramètres de cookies disponibles sur le site.
                </p>
            </section>

            {/* ------------------------------------------------ */}

            <section className="space-y-6 mb-12">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    7. Cookies déposés par des services tiers
                </h2>

                <p>
                    Certains services intégrés à {WEBSITE_URL} peuvent déposer leurs
                    propres cookies conformément à leurs politiques de
                    confidentialité respectives.
                </p>

                <ul className="list-disc pl-6 space-y-3">
                    <li>Google Analytics (mesure d'audience)</li>
                    <li>Clerk (authentification sécurisée)</li>
                    <li>Stripe (paiement sécurisé)</li>
                </ul>

                <p>
                    Ces services sont responsables des cookies qu'ils déposent.
                </p>
            </section>

            {/* ------------------------------------------------ */}

            <section className="space-y-6">
                <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
                    8. Contact
                </h2>

                <p>
                    Pour toute question concernant notre utilisation des cookies
                    ou l'exercice de vos droits, vous pouvez nous contacter :
                </p>

                <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6">
                    <p>
                        <strong>Email :</strong> contact@ouicv.fr
                    </p>

                    <p>
                        <strong>Adresse :</strong> [COMPANY ADDRESS]
                    </p>
                </div>
            </section>
        </div>
    );
}