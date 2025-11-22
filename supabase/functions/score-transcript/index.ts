import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Rubric {
  id: string;
  criterion_name: string;
  criterion_description: string;
  keywords: string | null;
  weight: number;
  min_words: number;
  max_words: number;
}

interface CriterionScore {
  name: string;
  description: string;
  weight: number;
  keyword_score: number;
  keywords_found: string[];
  similarity_score: number;
  length_score: number;
  combined_score: number;
  weighted_score: number;
  feedback: string;
}

// Simple word tokenizer
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .match(/\b[\w']+\b/g) || [];
}

// Compute keyword score
function computeKeywordScore(keywordsText: string | null, tokens: string[]): {
  found: string[];
  expected: number;
  score: number;
} {
  if (!keywordsText) {
    return { found: [], expected: 0, score: 1.0 };
  }

  const keywords = keywordsText
    .split(/[,;]/)
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  if (keywords.length === 0) {
    return { found: [], expected: 0, score: 1.0 };
  }

  const found: string[] = [];
  const tokenSet = new Set(tokens);
  const transcriptText = tokens.join(" ");

  for (const kw of keywords) {
    if (kw.includes(" ")) {
      // Multi-word keyword
      if (transcriptText.includes(kw)) {
        found.push(kw);
      }
    } else {
      // Single word keyword
      if (tokenSet.has(kw)) {
        found.push(kw);
      }
    }
  }

  const score = found.length / keywords.length;
  return { found, expected: keywords.length, score };
}

// Compute length score
function computeLengthScore(minWords: number, maxWords: number, totalWords: number): number {
  if (totalWords >= minWords && totalWords <= maxWords) {
    return 1.0;
  }
  
  if (totalWords < minWords) {
    const ratio = totalWords / Math.max(1, minWords);
    return Math.max(0.0, 0.5 * ratio);
  }
  
  if (totalWords > maxWords && maxWords > 0) {
    const ratio = maxWords / totalWords;
    return Math.max(0.0, 0.5 * ratio);
  }
  
  return 0.0;
}

// Compute semantic similarity using Lovable AI
async function computeSemanticSimilarity(
  transcript: string,
  description: string,
  apiKey: string
): Promise<number> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a semantic similarity analyzer. Rate how well the transcript matches the criterion description on a scale of 0.0 to 1.0. Respond ONLY with a number between 0.0 and 1.0, nothing else."
          },
          {
            role: "user",
            content: `Criterion: "${description}"\n\nTranscript: "${transcript}"\n\nSimilarity score (0.0-1.0):`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return 0.5; // fallback
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "0.5";
    const score = parseFloat(content.trim());
    
    return isNaN(score) ? 0.5 : Math.max(0.0, Math.min(1.0, score));
  } catch (error) {
    console.error("Error computing semantic similarity:", error);
    return 0.5; // fallback
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    
    if (!transcript || typeof transcript !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid transcript provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active rubrics
    const { data: rubrics, error: rubricError } = await supabase
      .from('rubrics')
      .select('*')
      .eq('is_active', true)
      .order('criterion_name');

    if (rubricError) {
      console.error("Error fetching rubrics:", rubricError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch rubrics" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rubrics || rubrics.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active rubrics found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize weights
    const totalWeight = rubrics.reduce((sum, r) => sum + Number(r.weight), 0);
    const normalizedRubrics = rubrics.map(r => ({
      ...r,
      weight: totalWeight > 0 ? Number(r.weight) / totalWeight : 1.0 / rubrics.length
    }));

    // Tokenize transcript
    const tokens = tokenize(transcript);
    const totalWords = tokens.length;

    // Score each criterion
    const criteriaScores: CriterionScore[] = [];
    let totalWeightedScore = 0;

    for (const rubric of normalizedRubrics) {
      // Keyword score
      const kwResult = computeKeywordScore(rubric.keywords, tokens);
      
      // Semantic similarity
      const simScore = await computeSemanticSimilarity(
        transcript,
        rubric.criterion_description,
        lovableApiKey
      );
      
      // Length score
      const lenScore = computeLengthScore(rubric.min_words, rubric.max_words, totalWords);
      
      // Combined score (weighted average of signals)
      const combined = 0.4 * kwResult.score + 0.4 * simScore + 0.2 * lenScore;
      const clampedCombined = Math.max(0, Math.min(1, combined));
      const weighted = clampedCombined * rubric.weight;
      
      totalWeightedScore += weighted;

      // Generate feedback
      const feedbackParts: string[] = [];
      if (kwResult.expected > 0) {
        if (kwResult.found.length === kwResult.expected) {
          feedbackParts.push("✓ All keywords found");
        } else if (kwResult.found.length === 0) {
          feedbackParts.push("✗ No keywords found");
        } else {
          const missing = (keywordsText: string | null) => {
            if (!keywordsText) return [];
            const kws = keywordsText.split(/[,;]/).map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
            return kws.filter((k: string) => !kwResult.found.includes(k));
          };
          feedbackParts.push(`Partial: ${kwResult.found.length}/${kwResult.expected} keywords`);
        }
      }
      feedbackParts.push(`Semantic match: ${(simScore * 100).toFixed(0)}%`);
      feedbackParts.push(`Length: ${totalWords} words (expected: ${rubric.min_words}-${rubric.max_words})`);

      criteriaScores.push({
        name: rubric.criterion_name,
        description: rubric.criterion_description,
        weight: rubric.weight,
        keyword_score: Math.round(kwResult.score * 1000) / 1000,
        keywords_found: kwResult.found,
        similarity_score: Math.round(simScore * 1000) / 1000,
        length_score: Math.round(lenScore * 1000) / 1000,
        combined_score: Math.round(clampedCombined * 1000) / 1000,
        weighted_score: Math.round(weighted * 10000) / 10000,
        feedback: feedbackParts.join(" • ")
      });
    }

    // Overall score (0-100)
    const overallScore = Math.max(0, Math.min(100, totalWeightedScore * 100));

    const result = {
      overall_score: Math.round(overallScore * 100) / 100,
      word_count: totalWords,
      criteria: criteriaScores
    };

    // Save to database
    await supabase
      .from('transcripts')
      .insert({
        transcript_text: transcript,
        overall_score: result.overall_score,
        word_count: totalWords,
        scoring_data: result.criteria
      });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in score-transcript function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});