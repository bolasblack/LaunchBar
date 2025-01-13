export interface Persona {
  title: string;
  icon: string;
  description: string;
  persona: string;
}

export interface Prompt {
  title: string;
  icon: string;
  description: string;
  argument: string;
  persona?: string;
  addClipboard?: boolean;
  addURL?: boolean;
  useCompare?: boolean;
}

export interface UserPresets {
  personas: Persona[];
  prompts: Prompt[];
}
