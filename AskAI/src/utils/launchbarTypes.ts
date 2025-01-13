interface ExtendableTypes {
  actionArgument: ActionArgument;
}

export interface ActionOutput {
  // one of these is required
  title?: string;
  path?: string
  url?: string
  actionBundleIdentifier?: string;

  // optional
  subtitle?: string;
  alwaysShowsSubtitle?: boolean;
  label?: string;
  badge?: string;
  icon?: string;
  iconFont?: string;
  iconIsTemplate?: boolean;
  quickLookURL?: string;
  action?: string;
  actionArgument?: ExtendableTypes['actionArgument'];
  actionReturnsItems?: boolean;
  actionRunsInBackground?: boolean;
  children?: ActionOutput[];
}

export type ActionInput_Path = `/${string}` & {
  __type: "ActionInput_Path";
};
export type ActionInput_UserInput = `${string}` & {
  __type: "ActionInput_UserInput";
};
export type ActionInput_ActionArgument = `{${string}}` & {
  __type: "ActionInput_ActionArgument";
};
export type ActionInput_Action = `{${string}}` & {
  __type: "ActionInput_Action";
};
export type ActionInput =
  | ActionInput_Path
  | ActionInput_UserInput
  | ActionInput_ActionArgument
  | ActionInput_Action;
