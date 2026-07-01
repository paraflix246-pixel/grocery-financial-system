let joinHouseholdStepCompleted = false;

export function markJoinHouseholdStepCompleted(): void {
  joinHouseholdStepCompleted = true;
}

export function hasCompletedJoinHouseholdStep(): boolean {
  return joinHouseholdStepCompleted;
}

export function resetJoinHouseholdStepForTests(): void {
  joinHouseholdStepCompleted = false;
}
