import { LaunchBar } from "./LaunchBar";

const supportedChromiumBrowsers = [
  "Brave Browser",
  "Vivaldi",
  "Google Chrome",
  "Arc",
] as const;
type SupportedChromiumBrowser = (typeof supportedChromiumBrowsers)[number];

const supportedBrowsers = [
  ...supportedChromiumBrowsers,
  "firefox",
  "Safari",
] as const;
type SupportedBrowser = (typeof supportedBrowsers)[number];

/**
 * Get current URL from supported browsers
 */
export async function getCurrentURL(): Promise<string | undefined> {
  // Get frontmost app
  const frontmost = (await LaunchBar.executeAppleScript(
    'tell application "System Events" to set _frontmoste to name of application processes whose frontmost is true as string'
  )).trim();

  // Check if browser is supported
  if (!supportedBrowsers.includes(frontmost as any)) {
    await LaunchBar.alert(frontmost + " is not a supported browser!");
    return undefined;
  }

  // Get URL based on browser type
  let url: string | undefined;

  if (supportedChromiumBrowsers.includes(frontmost as any)) {
    url = await getURLChromium(frontmost as any);
  } else if (frontmost === "Safari") {
    url = await getURLSafari();
  } else if (frontmost === "firefox") {
    url = await getURLFirefox();
  }

  return url;
}

async function getURLSafari(): Promise<string | undefined> {
  const url = await LaunchBar.executeAppleScript(
    'tell application "Safari"',
    "	if exists URL of current tab of window 1 then",
    "		set vURL to URL of current tab of window 1",
    "	end if",
    "end tell"
  );

  return url?.trim();
}

async function getURLFirefox(): Promise<string | undefined> {
  await LaunchBar.executeAppleScript(
    'tell application "Firefox" to activate',
    "delay 0.2",
    'tell application "System Events"',
    '	keystroke "l" using {command down}',
    "	delay 0.2",
    '	keystroke "c" using {command down}',
    "	delay 0.2",
    "	key code 53",
    "end tell",
    "delay 0.2"
  );

  return await LaunchBar.getClipboardString();
}

async function getURLChromium(
  browserName: SupportedChromiumBrowser
): Promise<string | undefined> {
  const url = await LaunchBar.executeAppleScript(
    'tell application "' + browserName + '"',
    "	if (count windows) ≠ 0 then",
    "		set vURL to URL of active tab of window 1",
    "	end if",
    "end tell"
  );

  return url?.trim();
}
