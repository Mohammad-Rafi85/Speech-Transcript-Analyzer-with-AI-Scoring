import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

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

interface ScoreResult {
  overall_score: number;
  word_count: number;
  criteria: CriterionScore[];
}

export function ScoreDisplay({ result }: { result: ScoreResult }) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-success";
    if (score >= 0.6) return "text-warning";
    return "text-destructive";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (score >= 0.6) return <AlertCircle className="w-5 h-5 text-warning" />;
    return <XCircle className="w-5 h-5 text-destructive" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-8 border-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Overall Score</h3>
            <p className="text-sm text-muted-foreground">Total words: {result.word_count}</p>
          </div>
          <div className="text-right">
            <div className={`text-6xl font-bold ${getScoreColor(result.overall_score / 100)}`}>
              {result.overall_score.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">out of 100</div>
          </div>
        </div>
        <Progress value={result.overall_score} className="h-3" />
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Per-Criterion Breakdown</h3>
        {result.criteria.map((criterion, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getScoreIcon(criterion.combined_score)}
                  <h4 className="text-lg font-semibold">{criterion.name}</h4>
                  <Badge variant="secondary">Weight: {(criterion.weight * 100).toFixed(0)}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{criterion.description}</p>
              </div>
              <div className="text-right ml-4">
                <div className={`text-4xl font-bold ${getScoreColor(criterion.combined_score)}`}>
                  {(criterion.combined_score * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Keywords</div>
                <div className="text-lg font-semibold">{(criterion.keyword_score * 100).toFixed(0)}%</div>
              </div>
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Semantic</div>
                <div className="text-lg font-semibold">{(criterion.similarity_score * 100).toFixed(0)}%</div>
              </div>
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Length</div>
                <div className="text-lg font-semibold">{(criterion.length_score * 100).toFixed(0)}%</div>
              </div>
            </div>

            <div className="space-y-2">
              {criterion.keywords_found.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium">Keywords found:</span>
                  {criterion.keywords_found.map((kw, i) => (
                    <Badge key={i} variant="outline" className="bg-success/10 border-success/30">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">
                {criterion.feedback}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}