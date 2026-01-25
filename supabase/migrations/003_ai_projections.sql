-- AI-Powered Projections System: Database Schema
-- Migration 003: Add tables for AI insights, recommendations, and chat context

-- Store pre-computed AI insights (cached for performance)
CREATE TABLE ai_projection_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES tours(id) ON DELETE CASCADE NOT NULL,
  insight_type text NOT NULL, -- 'size_curve', 'product_performance', 'regional_pattern', 'stockout_risk'
  insight_data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

CREATE INDEX idx_ai_insights_tour_type ON ai_projection_insights(tour_id, insight_type);
CREATE INDEX idx_ai_insights_expires ON ai_projection_insights(expires_at);

COMMENT ON TABLE ai_projection_insights IS 'Cached AI analysis results for projections (1-hour TTL)';
COMMENT ON COLUMN ai_projection_insights.insight_type IS 'Type of insight: size_curve, product_performance, regional_pattern, stockout_risk';
COMMENT ON COLUMN ai_projection_insights.insight_data IS 'JSON data containing the analysis results';
COMMENT ON COLUMN ai_projection_insights.expires_at IS 'Cache expiration time (default 1 hour from creation)';

-- Store AI recommendations with reasoning
CREATE TABLE ai_projection_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES forecast_scenarios(id) ON DELETE CASCADE NOT NULL,
  tour_id uuid REFERENCES tours(id) ON DELETE CASCADE NOT NULL,
  recommendation_type text NOT NULL, -- 'baseline', 'size_adjustment', 'risk_mitigation', 'product_priority'
  target_sku text NOT NULL,
  target_size text,
  target_bucket text,
  recommended_units integer NOT NULL,
  confidence_score numeric(3,2), -- 0.00 to 1.00
  reasoning text NOT NULL,
  supporting_data jsonb,
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'modified'
  applied_units integer, -- What user actually entered (if accepted/modified)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_recommendations_scenario ON ai_projection_recommendations(scenario_id, status);
CREATE INDEX idx_ai_recommendations_tour ON ai_projection_recommendations(tour_id);

COMMENT ON TABLE ai_projection_recommendations IS 'AI-generated projection recommendations with acceptance tracking';
COMMENT ON COLUMN ai_projection_recommendations.recommendation_type IS 'Type of recommendation: baseline, size_adjustment, risk_mitigation, product_priority';
COMMENT ON COLUMN ai_projection_recommendations.confidence_score IS 'AI confidence in recommendation (0.0-1.0)';
COMMENT ON COLUMN ai_projection_recommendations.status IS 'Recommendation status: pending, accepted, rejected, modified';
COMMENT ON COLUMN ai_projection_recommendations.applied_units IS 'Actual units user applied (may differ from recommended)';

-- Store chat conversation context
CREATE TABLE ai_chat_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES tours(id) ON DELETE CASCADE NOT NULL,
  scenario_id uuid REFERENCES forecast_scenarios(id) ON DELETE SET NULL,
  conversation_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot jsonb, -- Attendance, per-head, other inputs at time of chat
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_chat_tour_scenario ON ai_chat_context(tour_id, scenario_id);

COMMENT ON TABLE ai_chat_context IS 'Persistent chat conversation history for AI projection assistant';
COMMENT ON COLUMN ai_chat_context.conversation_history IS 'Array of {role, content, timestamp} chat messages';
COMMENT ON COLUMN ai_chat_context.context_snapshot IS 'Projection inputs (attendance, per-head) at chat time';
