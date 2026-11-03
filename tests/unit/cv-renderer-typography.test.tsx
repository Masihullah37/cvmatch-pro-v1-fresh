import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CVRenderer from "@/components/templates/CVRenderer";
import { CV_TEMPLATE_STYLES } from "@/lib/cv-template-styles";

describe.each(CV_TEMPLATE_STYLES)("CV renderer typography for %s", (style) => {
  it("renders with shared high-clarity typography and contrast rules", () => {
    const markup = renderToStaticMarkup(
      <CVRenderer
        template={{
          templateStyle: style,
          templateData: {
            userName: "Alex Morgan",
            jobTitle: "Product Designer",
            summary: "Experienced product designer.",
            experience: [],
            education: [],
            skills: [],
            languages: [],
            projects: [],
          },
        }}
      />
    );

    expect(markup).toContain("text-rendering: optimizeLegibility");
    expect(markup).toContain("font-kerning: normal");
    expect(markup).toContain(".cv-printable .text-slate-400");
  });
});
