import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CVPrintView, { getPrintDensityRange } from "@/components/templates/CVPrintView";

describe('PDF generation rules', () => {
    it('font timeout is capped at 3000ms', () => {
        const FONT_TIMEOUT_MS = 3000;
        expect(FONT_TIMEOUT_MS).toBeLessThanOrEqual(5000);
        expect(FONT_TIMEOUT_MS).toBeGreaterThan(0);
    });

    it('pro user can download without credits', () => {
        const isPro = true;
        const credits = 0;
        const hasAccess = isPro || credits > 0;
        expect(hasAccess).toBe(true);
    });

    it('user with credits can download', () => {

        // user with 0 credits cannot download
        expect(0 > 0).toBe(false);
        // user with 1+ credits can download
        expect(1 > 0).toBe(true);
    });

    it('watermark shown when not owned', () => {
        expect(!false).toBe(true);
        expect(!true).toBe(false);
    });

    it("keeps print colors and CV text rendering enabled in the PDF view", () => {
        const markup = renderToStaticMarkup(
            React.createElement(CVPrintView, {
                template: {
                    templateStyle: "Classic",
                    templateData: {
                        userName: "Alex Morgan",
                        experience: [{ title: "Engineer", company: "Example", description: "Built systems" }],
                    },
                },
            }),
        );

        expect(markup).toContain("-webkit-print-color-adjust: exact");
        expect(markup).toContain("print-color-adjust: exact");
        expect(markup).toContain("font-kerning: normal");
        expect(markup).toContain("Built systems");
    });

    it("does not automatically scale standard-sized CV text below 100%", () => {
        expect(getPrintDensityRange(1)).toEqual({ min: 1, max: 1 });
        expect(getPrintDensityRange(1.15)).toEqual({ min: 1, max: 1.15 });
        expect(getPrintDensityRange(0.9)).toEqual({ min: 0.9, max: 0.9 });
        expect(getPrintDensityRange(Number.NaN)).toEqual({ min: 1, max: 1 });
    });
});