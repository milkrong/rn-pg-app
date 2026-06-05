export type HealthKitCapability =
  | "menstrualFlow"
  | "basalBodyTemperature"
  | "ovulationTestResult";

export type HealthKitPermissionState = "not-determined" | "granted" | "denied";

export async function requestHealthKitPermissions(): Promise<Record<HealthKitCapability, HealthKitPermissionState>> {
  return {
    menstrualFlow: "not-determined",
    basalBodyTemperature: "not-determined",
    ovulationTestResult: "not-determined"
  };
}

export async function syncHealthKitRecords(): Promise<{ imported: number; exported: number }> {
  return { imported: 0, exported: 0 };
}
