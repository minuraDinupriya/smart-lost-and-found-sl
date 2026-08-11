const fs = require('fs');

const files = [
  'client/src/features/items/pages/PostItemPage.tsx',
  'client/src/features/items/pages/EditItemPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace standard inputs and selects that lack bg and text colors
  content = content.replace(/className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-\[#800000\]\/20 focus:border-\[#800000\] outline-none"/g, 'className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"');
  
  // Replace textareas
  content = content.replace(/className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-\[#800000\]\/20 focus:border-\[#800000\] outline-none resize-none"/g, 'className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none resize-none"');

  // Fix digital proof inputs that already have bg but lack text colors
  content = content.replace(/className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-\[#800000\]\/20 focus:border-\[#800000\] outline-none"/g, 'className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"');

  content = content.replace(/className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-\[#800000\]\/20 focus:border-\[#800000\] outline-none resize-none"/g, 'className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none resize-none"');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated', file);
}
