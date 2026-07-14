export type DocHeading = {
  id: string;
  title: string;
  level: 2 | 3;
};

export type NavItem = {
  title: string;
  href: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export type DocMeta = {
  title: string;
  description: string;
  href: string;
  section: string;
  headings: DocHeading[];
};
