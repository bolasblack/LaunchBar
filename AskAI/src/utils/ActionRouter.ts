import { ActionOutput } from "./launchbarTypes";

export type FallbackHandlerFn = (
  actionArgument: unknown
) => Promise<ActionOutput[]>;

export type HandlerFn<T> = (actionArgs: T) => Promise<void | ActionOutput[]>;

export class ActionRouter<Actions extends { type: string }> {
  private actionMap: Map<Actions["type"], HandlerFn<Actions>> = new Map();

  private fallbackHandler: FallbackHandlerFn;

  constructor(
    options: {
      fallbackHandler?: FallbackHandlerFn;
    } = {}
  ) {
    this.fallbackHandler =
      options.fallbackHandler ??
      (async (action) => {
        console.error("Action Handler not found", action);
        return [];
      });
  }

  register<T extends Actions["type"]>(
    actionType: T,
    actionHandler: HandlerFn<Actions & { type: T }>
  ) {
    this.actionMap.set(actionType, actionHandler as any);
  }

  async run<T extends Actions["type"]>(
    actionArguments: Actions & { type: T }
  ): Promise<ActionOutput[]> {
    const handler = this.actionMap.get(actionArguments.type);

    if (handler != null) {
      return (await handler(actionArguments)) ?? [];
    }

    return await this.fallbackHandler(actionArguments);
  }

  async handle(
    argv: string[],
    main: (input: string) => Promise<ActionOutput[]>
  ): Promise<ActionOutput[]> {
    let parsed: null | unknown;
    try {
      parsed = JSON.parse(argv[2]);
    } catch {
      parsed = null;
    }

    if (parsed == null) {
      return await main(argv[2]);
    } else {
      return await this.run(parsed as any);
    }
  }
}
