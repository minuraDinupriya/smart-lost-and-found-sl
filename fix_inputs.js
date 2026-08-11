const fs = require('fs');

const files = [
  'client/src/features/auth/pages/LoginPage.tsx',
  'client/src/features/auth/pages/RegisterPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace inputs in auth pages
  content = content.replace(/className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-4 focus:ring-\[#800000\]\/10 focus:border-\[#800000\] transition-all outline-none text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800"/g, 'className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] focus:bg-white dark:focus:bg-slate-800 transition-all outline-none"');

  // Replace inputs in auth pages without dark mode already
  content = content.replace(/className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-\[#800000\]\/10 focus:border-\[#800000\] transition-all outline-none text-gray-900 bg-gray-50 focus:bg-white"/g, 'className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-[#800000]/10 focus:border-[#800000] focus:bg-white dark:focus:bg-slate-800 transition-all outline-none"');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated', file);
}
