export type Trait = "payroll_manager" | "security_manager" | "chef";

export function hasTrait(traits: readonly Trait[], required: Trait): boolean {
  return traits.includes(required);
}
