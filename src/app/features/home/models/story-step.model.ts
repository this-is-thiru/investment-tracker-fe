export interface StoryStep {
  eyebrow: string;
  icon: string;
  title: string;
  body: string;
  points: string[];
  /** Title shown in the pinned screen's top bar */
  screen: string;
  /** App route the step links to; omitted for features that are still on the way */
  route?: string;
  cta?: string;
  soon?: boolean;
}
