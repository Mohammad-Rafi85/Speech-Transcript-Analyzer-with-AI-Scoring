import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { Loader2, Mic, FileText, Sparkles } from "lucide-react";

const SAMPLE_TRANSCRIPT = `Hello, good morning. My name is Mohammad Rafi. I am a third-year Computer Science student at XYZ University. I have worked on a small project building an AI-based image classifier during my internship where I used Python and PyTorch. I have strong skills in data structures and algorithms and I have completed a Coursera certification in Machine Learning. Thank you for listening. I look forward to opportunities to intern and gain more experience.`;

interface ScoreResult {
  overall_score: number;
  word_count: number;
  criteria: Array<{
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
  }>;
}

const Index = () => {
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const { toast } = useToast();

  const handleScore = async () => {
    if (!transcript.trim()) {
      toast({
        title: "Empty transcript",
        description: "Please enter a transcript to score.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("score-transcript", {
        body: { transcript },
      });

      if (error) {
        console.error("Function error:", error);
        throw new Error(error.message || "Failed to score transcript");
      }

      if (!data) {
        throw new Error("No data returned from scoring function");
      }

      setResult(data);
      toast({
        title: "Scoring complete!",
        description: `Overall score: ${data.overall_score.toFixed(1)}/100`,
      });
    } catch (error) {
      console.error("Error scoring transcript:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to score transcript",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setTranscript(SAMPLE_TRANSCRIPT);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI Communication Scorer
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Analyze spoken communication skills with AI-powered rubric-based scoring. 
            Get detailed feedback on introduction, background, skills, and closing.
          </p>
        </div>

        <Card className="p-8 mb-8 shadow-xl animate-in fade-in slide-in-from-bottom duration-700 delay-150">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Transcript Input</h2>
          </div>
          
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your transcript here or load a sample..."
            className="min-h-[200px] mb-4 text-base resize-none"
            disabled={loading}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleScore}
              disabled={loading || !transcript.trim()}
              size="lg"
              className="font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Scoring...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Score Transcript
                </>
              )}
            </Button>

            <Button
              onClick={loadSample}
              disabled={loading}
              variant="outline"
              size="lg"
            >
              Load Sample
            </Button>

            {transcript && (
              <Button
                onClick={() => {
                  setTranscript("");
                  setResult(null);
                }}
                disabled={loading}
                variant="ghost"
                size="lg"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            <p className="font-medium mb-2">Scoring methodology:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>40% Keyword matching (presence of expected terms)</li>
              <li>40% Semantic similarity (AI-powered content analysis)</li>
              <li>20% Length appropriateness (word count vs. expected range)</li>
            </ul>
          </div>
        </Card>

        {result && <ScoreDisplay result={result} />}

        {!result && !loading && (
          <Card className="p-8 text-center bg-secondary/30 border-dashed animate-in fade-in duration-700 delay-300">
            <Mic className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2 text-muted-foreground">Ready to analyze</h3>
            <p className="text-muted-foreground">
              Enter a transcript above and click "Score Transcript" to get detailed AI-powered feedback
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;