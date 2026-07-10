import { generateLLMResponse } from "@/lib/ai/llm-gateway";

function safeParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}


function normalize(text: string = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .trim();
}


function stringifyResume(resume: any) {
  return JSON.stringify(resume).toLowerCase();
}


function findMissingKeywords(
  resume: any,
  keywords: string[]
) {
  const resumeText = stringifyResume(resume);

  return keywords.filter(keyword => {
    return !resumeText.includes(normalize(keyword));
  });
}


export async function validateOptimizedCV(
  optimizedCV: any,
  analysisResult: {
    keywordsMissing?: string[] | null;
    keywordsFound?: string[] | null;
    atsScore?: number | null;
    suggestions?: string[] | null;
    flaws?: string[] | null;
  }
) {

  if (!optimizedCV) {
    throw new Error("No optimized CV provided");
  }


  const missingKeywords =
    analysisResult?.keywordsMissing || [];


  if (!missingKeywords.length) {
    return optimizedCV;
  }


  const stillMissing = findMissingKeywords(
    optimizedCV,
    missingKeywords
  );


  console.log(
    "Validator missing keywords:",
    stillMissing
  );


  /*
    Nothing important missing.
    Save original generated CV.
  */
  if (stillMissing.length === 0) {
    return optimizedCV;
  }



  /*
    One and only one retry.
  */

  const prompt = `
You are an expert ATS resume validator.

You are reviewing an already optimized resume.

Your task:

1. Check whether the missing ATS keywords below can truthfully fit the candidate.
2. If they can fit:
   - integrate them naturally into the resume.
   - update summary, experience, projects, or skills.
3. If they cannot truthfully fit:
   - do not add them.

Never:
- invent companies
- invent jobs
- invent certifications
- invent projects
- invent technologies never used

Return ONLY valid JSON.

The JSON structure MUST remain identical.

========================

Missing ATS keywords:

${stillMissing.join(", ")}


========================

ATS Suggestions:

${analysisResult.suggestions?.join("\n") || "None"}


========================

Resume:

${JSON.stringify(optimizedCV, null, 2)}

========================

Return JSON only.
`;


  try {

    const response = await generateLLMResponse({
      prompt,
      temperature: 0.1,
      maxTokens: 3500,
    });


    const repaired = safeParseJSON(response);


    if (!repaired) {
      console.warn(
        "Resume validator returned invalid JSON"
      );

      return optimizedCV;
    }


    console.log(
      "Resume validator successfully improved CV"
    );


    return repaired;


  } catch (error) {

    console.error(
      "Resume validation failed:",
      error
    );

    /*
      Never break the user flow.
      Return the first generated CV.
    */

    return optimizedCV;
  }
}