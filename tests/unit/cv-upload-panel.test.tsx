import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CVUploadPanel from "@/components/home/CVUploadPanel";

describe("CVUploadPanel file types", () => {
  it("accepts PDF, legacy Word, and DOCX uploads", () => {
    const markup = renderToStaticMarkup(
      <CVUploadPanel
        cvFile={null}
        setCvFile={() => {}}
        cvUrl=""
        setCvUrl={() => {}}
      />,
    );

    expect(markup).toContain(".pdf");
    expect(markup).toContain(".doc");
    expect(markup).toContain(".docx");
  });
});
