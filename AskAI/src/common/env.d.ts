declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * The absolute path to the .lbaction bundle.
       */
      LB_ACTION_PATH: string;

      /**
       * The absolute path to the action's cache directory:
       * ~/Library/Caches/at.obdev.LaunchBar/Actions/_Action Bundle Identifier_/
       * 
       * The action's cache directory can be used to store files that can be recreated by the action itself,
       * e.g. by downloading a file from a server again. Currently, this directory's contents will never be
       * touched by LaunchBar, but it may be periodically cleared in a future release.
       * 
       * When the action is run, this directory is guaranteed to exist.
       */
      LB_CACHE_PATH: string;

      /**
       * The absolute path to the action's support directory:
       * ~/Library/Application Support/LaunchBar/Action Support/Action Bundle Identifier/
       * 
       * The action support directory can be used to persist user data between runs of the action,
       * like preferences.
       * 
       * When the action is run, this directory is guaranteed to exist.
       */
      LB_SUPPORT_PATH: string;

      /**
       * Corresponds to LBDebugLogEnabled in the action's Info.plist.
       */
      LB_DEBUG_LOG_ENABLED: string;

      /**
       * The path to the LaunchBar.app bundle.
       */
      LB_LAUNCHBAR_PATH: string;

      /**
       * The type of the script, as defined by the action's Info.plist.
       * This is either:
       * - "default": The default script type
       * - "suggestions": For suggestion scripts
       * - "actionURL": For URL handling scripts
       * 
       * See Script Types for more information.
       */
      LB_SCRIPT_TYPE: 'default' | 'suggestions' | 'actionURL';

      /**
       * Indicates if the Command key was down while running the action.
       * - "1": Command key was pressed
       * - "0": Command key was not pressed
       */
      LB_OPTION_COMMAND_KEY: '0' | '1';

      /**
       * Indicates if the Alternate (Option) key was down while running the action.
       * - "1": Option key was pressed
       * - "0": Option key was not pressed
       */
      LB_OPTION_ALTERNATE_KEY: '0' | '1';

      /**
       * Indicates if the Shift key was down while running the action.
       * - "1": Shift key was pressed
       * - "0": Shift key was not pressed
       */
      LB_OPTION_SHIFT_KEY: '0' | '1';

      /**
       * Indicates if the Control key was down while running the action.
       * - "1": Control key was pressed
       * - "0": Control key was not pressed
       */
      LB_OPTION_CONTROL_KEY: '0' | '1';

      /**
       * Indicates if the action was run by pressing the Space key.
       * - "1": Action was triggered by Space key
       * - "0": Action was triggered by other means
       */
      LB_OPTION_SPACE_KEY: '0' | '1';

      /**
       * Indicates if the action is running in background.
       * - "1": Action is running in background
       * - "0": Action is running in foreground
       */
      LB_OPTION_RUN_IN_BACKGROUND: '0' | '1';

      /**
       * Indicates if the action is run to produce results for live feedback.
       * - "1": Action is running for live feedback
       * - "0": Action is running normally
       */
      LB_OPTION_LIVE_FEEDBACK: '0' | '1';
    }
  }
}

export {};
