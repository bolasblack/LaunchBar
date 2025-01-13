import { readdir, exists } from "node:fs/promises";
import { Action } from "./Action";
import { readPlist } from "../utils/plistHelpers";

interface InfoPlist {
  CFBundleName: string;
  CFBundleIdentifier: string;
  UTImportedTypeDeclarations?: Array<{
    UTTypeTagSpecification?: {
      "public.filename-extension"?: string[];
    };
  }>;
  UTExportedTypeDeclarations?: Array<{
    UTTypeTagSpecification?: {
      "public.filename-extension"?: string[];
    };
  }>;
  CFBundleDocumentTypes?: Array<{
    CFBundleTypeExtensions?: string[];
  }>;
}

export async function getAvailableEditors(): Promise<EditorInfo[]> {
  const installedApps = await readdir("/Applications/");

  const result = await Promise.all(
    installedApps.flatMap(async (item): Promise<EditorInfo[]> => {
      if (!item.endsWith(".app")) return [];

      const infoPlistPath = "/Applications/" + item + "/Contents/Info.plist";
      if (!(await exists(infoPlistPath))) return [];

      try {
        const infoPlist = await readPlist<InfoPlist>(infoPlistPath, true);
        const bundleName = infoPlist.CFBundleName;
        const appID = infoPlist.CFBundleIdentifier;

        if (!bundleName || !appID) return [];

        if (isMarkdownSupported(infoPlist)) {
          return [
            {
              appID: appID,
              bundleName: bundleName,
              isMarkdownSupported: true,
            },
          ];
        }

        return [];
      } catch (error) {
        console.error(`Failed to read plist file ${infoPlistPath}:`, error);
        return [];
      }
    })
  );

  return result.flat().sort((a, b) => a.bundleName.localeCompare(b.bundleName));
}

export interface EditorInfo {
  appID: string;
  bundleName: string;
  isMarkdownSupported: boolean;
}

export async function isSelectedEditor(appID: string): Promise<boolean> {
  const selectedEditor = await Action.getPreference<EditorInfo>(
    "selectedEditor"
  );
  return selectedEditor?.appID === appID;
}

export async function setSelectedEditor(dict: EditorInfo): Promise<void> {
  await Action.setPreference("selectedEditor", dict);
}

export async function getSelectedEditor(): Promise<EditorInfo | null> {
  return (await Action.getPreference<EditorInfo>("selectedEditor")) ?? null;
}

function isMarkdownSupported(infoPlist: InfoPlist): boolean {
  const markdownExtensions = ["markdown", "md"];

  const checkPublicFilenameExtension = (
    extension: undefined | string | string[]
  ): boolean => {
    if (extension == null) return false;

    if (typeof extension === "string") {
      return markdownExtensions.includes(extension);
    } else {
      return extension.some((ext) => markdownExtensions.includes(ext));
    }
  };

  const importedTypeDeclarations = infoPlist.UTImportedTypeDeclarations;
  if (
    importedTypeDeclarations?.some((item) =>
      checkPublicFilenameExtension(
        item.UTTypeTagSpecification?.["public.filename-extension"]
      )
    )
  ) {
    return true;
  }

  const exportedTypeDeclarations = infoPlist.UTExportedTypeDeclarations;
  if (
    exportedTypeDeclarations?.some((item) =>
      checkPublicFilenameExtension(
        item.UTTypeTagSpecification?.["public.filename-extension"]
      )
    )
  ) {
    return true;
  }

  const documentTypes = infoPlist.CFBundleDocumentTypes;
  if (
    documentTypes?.some((item) =>
      item.CFBundleTypeExtensions?.some((ext) =>
        markdownExtensions.includes(ext)
      )
    )
  ) {
    return true;
  }

  return false;
}
