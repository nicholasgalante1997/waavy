export type UpgradeOptions = {
  currentVersion: string;
  requestedVersion: string;
  latestVersion: string;
};

export type UpgradeAction = (options: UpgradeOptions) => Promise<void>;
