/**
 * Derives a visual color theme from a topic string.
 * Used to tint BackgroundGradients orbs and scene accents to match the tech's brand.
 */

export interface TechTheme {
  /** Main accent color (hex) */
  primary: string;
  /** Secondary accent (hex) — used for gradient second orb */
  secondary: string;
  /** Subtle tinted background overlay */
  accentBg: string;
  /** BackgroundGradients variant to use */
  variant: 'default' | 'code' | 'arch' | 'concept' | 'comparison' | 'summary';
}

const DEFAULT_THEME: TechTheme = {
  primary: '#00D9FF',
  secondary: '#8B5CF6',
  accentBg: 'rgba(0,217,255,0.06)',
  variant: 'default',
};

// Map of keyword → theme
const THEME_MAP: Array<{ keywords: string[]; theme: TechTheme }> = [
  {
    keywords: ['redis', 'cache', 'caching', 'memcache', 'memcached'],
    theme: { primary: '#DC382D', secondary: '#FF6B6B', accentBg: 'rgba(220,56,45,0.08)', variant: 'arch' },
  },
  {
    keywords: ['docker', 'container', 'containers', 'containerization'],
    theme: { primary: '#2496ED', secondary: '#0db7ed', accentBg: 'rgba(36,150,237,0.08)', variant: 'arch' },
  },
  {
    keywords: ['kubernetes', 'k8s', 'helm', 'pod', 'pods', 'orchestration'],
    theme: { primary: '#326CE5', secondary: '#6096FE', accentBg: 'rgba(50,108,229,0.08)', variant: 'arch' },
  },
  {
    keywords: ['react', 'jsx', 'hooks', 'component', 'components', 'reactjs'],
    theme: { primary: '#61DAFB', secondary: '#00B4D8', accentBg: 'rgba(97,218,251,0.08)', variant: 'code' },
  },
  {
    keywords: ['javascript', 'js', 'ecmascript', 'vanilla js', 'es6', 'es2015'],
    theme: { primary: '#F7DF1E', secondary: '#F0B429', accentBg: 'rgba(247,223,30,0.06)', variant: 'code' },
  },
  {
    keywords: ['typescript', 'ts', 'type safety', 'typed', 'types'],
    theme: { primary: '#3178C6', secondary: '#5096DB', accentBg: 'rgba(49,120,198,0.08)', variant: 'code' },
  },
  {
    keywords: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'pytorch', 'tensorflow'],
    theme: { primary: '#3776AB', secondary: '#FFD43B', accentBg: 'rgba(55,118,171,0.08)', variant: 'code' },
  },
  {
    keywords: ['vue', 'vuejs', 'nuxt', 'nuxtjs', 'composition api'],
    theme: { primary: '#42B883', secondary: '#35495E', accentBg: 'rgba(66,184,131,0.08)', variant: 'code' },
  },
  {
    keywords: ['angular', 'angularjs', 'ng', 'rxjs', 'ngrx'],
    theme: { primary: '#DD0031', secondary: '#C3002F', accentBg: 'rgba(221,0,49,0.06)', variant: 'code' },
  },
  {
    keywords: ['svelte', 'sveltekit'],
    theme: { primary: '#FF3E00', secondary: '#FF6B35', accentBg: 'rgba(255,62,0,0.06)', variant: 'code' },
  },
  {
    keywords: ['nextjs', 'next.js', 'next js', 'vercel', 'server components', 'app router'],
    theme: { primary: '#ffffff', secondary: '#a0a0a0', accentBg: 'rgba(255,255,255,0.04)', variant: 'default' },
  },
  {
    keywords: ['golang', ' go ', 'gopher', 'go language'],
    theme: { primary: '#00ADD8', secondary: '#00D4FF', accentBg: 'rgba(0,173,216,0.08)', variant: 'code' },
  },
  {
    keywords: ['rust', 'cargo', 'rustlang', 'ferris'],
    theme: { primary: '#CE422B', secondary: '#FF6B4D', accentBg: 'rgba(206,66,43,0.08)', variant: 'code' },
  },
  {
    keywords: ['postgresql', 'postgres', 'sql', 'database', 'relational', 'mysql', 'sqlite'],
    theme: { primary: '#336791', secondary: '#6096CB', accentBg: 'rgba(51,103,145,0.08)', variant: 'arch' },
  },
  {
    keywords: ['mongodb', 'mongo', 'nosql', 'document database', 'atlas'],
    theme: { primary: '#10AA50', secondary: '#00D968', accentBg: 'rgba(16,170,80,0.08)', variant: 'arch' },
  },
  {
    keywords: ['graphql', 'apollo', 'schema', 'resolver', 'query language'],
    theme: { primary: '#E535AB', secondary: '#FF7ACA', accentBg: 'rgba(229,53,171,0.06)', variant: 'arch' },
  },
  {
    keywords: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'ecs', 'eks'],
    theme: { primary: '#FF9900', secondary: '#FFB84D', accentBg: 'rgba(255,153,0,0.06)', variant: 'arch' },
  },
  {
    keywords: ['kafka', 'message queue', 'message broker', 'event streaming', 'rabbitmq', 'pubsub', 'pub/sub'],
    theme: { primary: '#ffffff', secondary: '#8B8B8B', accentBg: 'rgba(255,255,255,0.04)', variant: 'arch' },
  },
  {
    keywords: ['tailwind', 'tailwindcss', 'css', 'styling', 'design system'],
    theme: { primary: '#38BDF8', secondary: '#0EA5E9', accentBg: 'rgba(56,189,248,0.08)', variant: 'code' },
  },
  {
    keywords: ['firebase', 'firestore', 'realtime database', 'google firebase'],
    theme: { primary: '#FFCA28', secondary: '#FFA000', accentBg: 'rgba(255,202,40,0.06)', variant: 'arch' },
  },
  {
    keywords: ['terraform', 'infrastructure as code', 'iac', 'ansible', 'devops'],
    theme: { primary: '#7B42BC', secondary: '#A855F7', accentBg: 'rgba(123,66,188,0.08)', variant: 'arch' },
  },
  {
    keywords: ['machine learning', 'ml', 'deep learning', 'neural network', 'ai', 'artificial intelligence', 'llm', 'transformer', 'gpt'],
    theme: { primary: '#10B981', secondary: '#059669', accentBg: 'rgba(16,185,129,0.08)', variant: 'concept' },
  },
  {
    keywords: ['security', 'auth', 'authentication', 'authorization', 'oauth', 'jwt', 'encryption', 'ssl', 'tls'],
    theme: { primary: '#F59E0B', secondary: '#D97706', accentBg: 'rgba(245,158,11,0.06)', variant: 'concept' },
  },
  {
    keywords: ['microservices', 'service mesh', 'api gateway', 'grpc', 'rest api', 'restful'],
    theme: { primary: '#8B5CF6', secondary: '#A78BFA', accentBg: 'rgba(139,92,246,0.08)', variant: 'arch' },
  },
  {
    keywords: ['git', 'github', 'version control', 'branching', 'merge', 'rebase'],
    theme: { primary: '#F05033', secondary: '#FF7055', accentBg: 'rgba(240,80,51,0.06)', variant: 'concept' },
  },
  {
    keywords: ['node', 'nodejs', 'express', 'npm', 'yarn', 'deno', 'bun'],
    theme: { primary: '#339933', secondary: '#44BB44', accentBg: 'rgba(51,153,51,0.08)', variant: 'code' },
  },
  {
    keywords: ['solid', 'solid principles', 'design patterns', 'architecture patterns', 'clean code'],
    theme: { primary: '#00D9FF', secondary: '#8B5CF6', accentBg: 'rgba(0,217,255,0.06)', variant: 'concept' },
  },
];

export function getTechTheme(topic: string): TechTheme {
  if (!topic) return DEFAULT_THEME;
  const lower = topic.toLowerCase();

  for (const { keywords, theme } of THEME_MAP) {
    if (keywords.some(kw => lower.includes(kw))) {
      return theme;
    }
  }

  return DEFAULT_THEME;
}
