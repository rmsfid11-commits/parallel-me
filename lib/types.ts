export type SimulationMode = "희망적 우주" | "현실적 우주" | "최악의 우주";

export interface UserProfile {
  job: string;
  age: number;
  concern: string;
  goal: string;
  mode: SimulationMode;
}

export interface Choice {
  emoji: string;
  label: string;
}

export interface Scenario {
  id: string;
  stepNumber: number;
  scenario: string;
  preview: string;
  choices: Choice[];
  parentId: string | null;
  choiceIndex?: number;        // which choice index on parent led here
  chosenLabel?: string;        // which choice text led here
  isIntervention: boolean;
  interventionText?: string;
}
