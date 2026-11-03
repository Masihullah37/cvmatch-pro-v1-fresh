import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CVRenderer from "@/components/templates/CVRenderer";
import { CV_TEMPLATE_STYLES } from "@/lib/cv-template-styles";
import {
  mapImportedCvData,
  preserveImportedCvContent,
} from "@/lib/cv/import-mapping";

describe("CV import mapping", () => {
  it("maps sections by purpose, splits skills, and keeps unmatched content editable", () => {
    const mapped = mapImportedCvData(
      {
        fullName: "Alex Morgan",
        professionalExperience: [
          {
            position: "Engineer",
            employer: "Example Corp",
            dates: "2020-2024",
            responsibilities: "Built reliable systems",
          },
        ],
        competencies: ["PostgreSQL, SQL", "Communication"],
        academicBackground: [
          { qualification: "MSc Computer Science", institution: "Example University", year: "2020" },
        ],
        contact: { website: "https://alex.example", linkedin: "https://linkedin.example/alex" },
        certifications: [{ name: "Cloud Architect", issuer: "Example Org", year: "2024" }],
      },
      "Alex Morgan\nProfessional Experience\nEngineer\nCertifications\nCloud Architect\nUnclassified source detail",
    );

    expect(mapped.userName).toBe("Alex Morgan");
    expect(mapped.experience).toEqual([
      expect.objectContaining({
        title: "Engineer",
        company: "Example Corp",
        period: "2020-2024",
        description: "Built reliable systems",
      }),
    ]);
    expect(mapped.skills).toEqual(["PostgreSQL", "SQL", "Communication"]);
    expect(mapped.education).toEqual([
      expect.objectContaining({
        degree: "MSc Computer Science",
        school: "Example University",
        year: "2020",
      }),
    ]);
    expect(mapped.contact).toEqual(expect.objectContaining({
      portfolio: "https://alex.example",
      linkedin: "https://linkedin.example/alex",
    }));
    expect(mapped.certifications).toContain("Cloud Architect");
    expect(mapped.certifications).toContain("issuer: Example Org");
    expect(mapped.additionalSections).toContain("Unclassified source detail");
    expect(mapped.headers).toEqual(expect.objectContaining({
      experience: "Expérience",
      additionalSections: "Autres informations",
    }));
    expect(mapped.sectionOrder).toContain("certifications");
    expect(mapped.sectionOrder).toContain("additionalSections");
  });

  it("retains imported list entries when optimized content omits them", () => {
    const result = preserveImportedCvContent(
      {
        userName: "Alex Morgan",
        jobTitle: "Original Role",
        experience: [{ title: "Original Role", company: "Original Employer", description: "Original work" }],
        skills: ["PostgreSQL", "SQL"],
        contact: { email: "alex@example.com" },
        certifications: ["Original Certification"],
      },
      {
        userName: "",
        jobTitle: "",
        experience: [{ title: "Optimized Role", company: "Original Employer", description: "Optimized work" }],
        skills: ["SQL"],
        contact: {},
        certifications: [],
      },
    );

    expect(result.experience).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Original Role" }),
      expect.objectContaining({ title: "Optimized Role" }),
    ]));
    expect(result.skills).toEqual(["SQL", "PostgreSQL"]);
    expect(result.contact).toEqual(expect.objectContaining({ email: "alex@example.com" }));
    expect(result.userName).toBe("Alex Morgan");
    expect(result.jobTitle).toBe("Original Role");
    expect(result.certifications).toContain("Original Certification");
  });

  it("keeps source headings and lines when structured extraction misses a section", () => {
    const mapped = mapImportedCvData(
      { userName: "Alex Morgan", experience: [], skills: [] },
      "Professional Experience\nSenior engineer leading platform migrations",
    );

    expect(mapped.additionalSections).toEqual([
      "Professional Experience",
      "Senior engineer leading platform migrations",
    ]);
  });
});

describe.each(CV_TEMPLATE_STYLES)("Imported CV rendering for %s", (style) => {
  it("renders mapped sections and contact icons through the shared template renderer", () => {
    const data = mapImportedCvData({
      userName: "Alex Morgan",
      jobTitle: "Engineer",
      summary: "Experienced engineer",
      contact: {
        email: "alex@example.com",
        linkedin: "https://linkedin.example/alex",
        portfolio: "https://alex.example",
      },
      experience: [{ title: "Engineer", company: "Example Corp", period: "2020-2024", description: "Built systems" }],
      education: [{ degree: "MSc", school: "Example University", year: "2020", details: "" }],
      skills: ["PostgreSQL", "SQL"],
      languages: [],
      projects: [],
      certifications: ["Cloud Architect"],
    });
    const markup = renderToStaticMarkup(
      <CVRenderer template={{ templateStyle: style, templateData: data }} />,
    );

    expect(markup).toContain("Alex Morgan");
    expect(markup).toContain("PostgreSQL");
    expect(markup).toContain("SQL");
    expect(markup).toContain("Cloud Architect");
    expect(markup).toContain('aria-label="LinkedIn"');
    expect(markup).toContain('aria-label="Portfolio"');
  });
});
