const fs = require('fs');

const files = [
  'client/src/features/items/pages/PostItemPage.tsx',
  'client/src/features/items/pages/EditItemPage.tsx'
];

const replacements = [
  { search: /\bbg-white\b(?! dark:bg-slate-800)/g, replace: 'bg-white dark:bg-slate-800' },
  { search: /\bbg-gray-50\b(?! dark:bg-slate-900)/g, replace: 'bg-gray-50 dark:bg-slate-900' },
  { search: /\bbg-gray-100\b(?! dark:bg-slate-800)/g, replace: 'bg-gray-100 dark:bg-slate-800' },
  { search: /\btext-gray-900\b(?! dark:text-gray-100)/g, replace: 'text-gray-900 dark:text-gray-100' },
  { search: /\btext-gray-800\b(?! dark:text-gray-200)/g, replace: 'text-gray-800 dark:text-gray-200' },
  { search: /\btext-gray-700\b(?! dark:text-gray-300)/g, replace: 'text-gray-700 dark:text-gray-300' },
  { search: /\btext-gray-600\b(?! dark:text-gray-400)/g, replace: 'text-gray-600 dark:text-gray-400' },
  { search: /\btext-gray-500\b(?! dark:text-gray-400)/g, replace: 'text-gray-500 dark:text-gray-400' },
  { search: /\bborder-gray-100\b(?! dark:border-slate-700)/g, replace: 'border-gray-100 dark:border-slate-700' },
  { search: /\bborder-gray-200\b(?! dark:border-slate-600)/g, replace: 'border-gray-200 dark:border-slate-600' },
  { search: /\bdivide-gray-100\b(?! dark:divide-slate-700)/g, replace: 'divide-gray-100 dark:divide-slate-700' },
  { search: /\bhover:bg-gray-50\b(?! dark:hover:bg-slate-700)/g, replace: 'hover:bg-gray-50 dark:hover:bg-slate-700' },
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  for (const { search, replace } of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
}
