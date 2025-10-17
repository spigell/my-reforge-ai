export type Task = {
  repo: string;
  branch?: string;
  agents?: string[];
  kind?: string;
  idea?: string;
  'description-file'?: string;
  stage?: 'planning' | 'implementing';
  pr_link?: string;
  review_required?: boolean;
  sourceFile?: string;
};
