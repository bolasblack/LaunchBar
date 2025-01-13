import { join } from "node:path";
import { readPlist } from "../utils/plistHelpers";
import { readJSON, writeJSON } from "../utils/jsonHelpers";

interface InfoPlist {
  CFBundleVersion: string;
  CFBundleShortVersionString: string;
  CFBundleIdentifier: string;
  LBDebugLogEnabled: boolean;
}

async function getInfoPlist(): Promise<InfoPlist> {
  const plistPath = join(process.env.LB_ACTION_PATH, "Contents/Info.plist");
  return await readPlist<InfoPlist>(plistPath);
}

export const Action = {
  /**
   * The absolute path to the .lbaction bundle.
   * @see https://developer.obdev.at/launchbar-developer-documentation/#/javascript-action
   */
  async getPath(): Promise<string> {
    return process.env.LB_ACTION_PATH;
  },

  /**
   * The type of the script, as defined by the action's Info.plist.
   * This is either "default", "suggestions" or "actionURL".
   * @see https://developer.obdev.at/launchbar-developer-documentation/#/javascript-action
   */
  async getScriptType(): Promise<"default" | "suggestions" | "actionURL"> {
    return process.env.LB_SCRIPT_TYPE as "default" | "suggestions" | "actionURL";
  },

  /**
   * Corresponds to CFBundleVersion in the action's Info.plist
   * @see https://developer.obdev.at/launchbar-developer-documentation/#/javascript-action
   */
  async getVersion(): Promise<string> {
    return (await getInfoPlist()).CFBundleVersion;
  },

  /**
   * Corresponds to CFBundleShortVersionString in the action's Info.plist
   * @see https://developer.obdev.at/launchbar-developer-documentation/#/javascript-action
   */
  async getShortVersion(): Promise<string> {
    return (await getInfoPlist()).CFBundleShortVersionString;
  },

  /**
   * Corresponds to CFBundleIdentifier in the action's Info.plist
   * @see https://developer.obdev.at/launchbar-developer-documentation/#/javascript-action
   */
  async getBundleIdentifier(): Promise<string> {
    return (await getInfoPlist()).CFBundleIdentifier;
  },

  /**
   * The absolute path to the action's cache directory:
   * ~/Library/Caches/at.obdev.LaunchBar/Actions/Action Bundle Identifier/
   * 
   * The action's cache directory can be used to store files that can be recreated by the action itself,
   * e.g. by downloading a file from a server again. Currently, this directory's contents will never be
   * touched by LaunchBar, but it may be periodically cleared in a future release.
   * 
   * When the action is run, this directory is guaranteed to exist.
   * @see https://developer.obdev.at/launchbar-developer-documentation/#/javascript-action
   */
  async getCachePath(): Promise<string> {
    return process.env.LB_CACHE_PATH;
  },

  /**
   * The absolute path to the action's support directory:
   * ~/Library/Application Support/LaunchBar/Action Support/Action Bundle Identifier/
   * 
   * The action support directory can be used to persist user data between runs of the action, like preferences.
   * 
   * When the action is run, this directory is guaranteed to exist.
   * * @see https://developer.obdev.at/launchbar-developer-documentation/#/javascript-action
   */
  async getSupportPath(): Promise<string> {
    return process.env.LB_SUPPORT_PATH;
  },

  /**
   * Corresponds to LBDebugLogEnabled in the action's Info.plist
   * @see https://developer.obdev.at/launchbar-developer-documentation/#/javascript-action
   */
  async getDebugLogEnabled(): Promise<boolean> {
    return (await getInfoPlist()).LBDebugLogEnabled;
  },

  /**
   * Get a preference value
   * @param key The preference key
   * @param defaultValue The default value to return if the preference doesn't exist
   * @returns The preference value or the default value
   */
  async getPreference<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const supportPath = await this.getSupportPath();
    const prefsPath = join(supportPath, "Preferences.json");
    const prefs = await readJSON<Record<string, unknown>>(prefsPath) || {};
    return (prefs[key] as T) ?? defaultValue;
  },

  /**
   * Set a preference value
   * @param key The preference key
   * @param value The preference value
   */
  async setPreference<T>(key: string, value: T): Promise<void> {
    const supportPath = await this.getSupportPath();
    const prefsPath = join(supportPath, "Preferences.json");
    const prefs = await readJSON<Record<string, unknown>>(prefsPath) || {};
    prefs[key] = value;
    await writeJSON(prefsPath, prefs);
  },

  /**
   * Remove a preference
   * @param key The preference key
   */
  async removePreference(key: string): Promise<void> {
    const supportPath = await this.getSupportPath();
    const prefsPath = join(supportPath, "Preferences.json");
    const prefs = await readJSON<Record<string, unknown>>(prefsPath) || {};
    delete prefs[key];
    await writeJSON(prefsPath, prefs);
  },
};
