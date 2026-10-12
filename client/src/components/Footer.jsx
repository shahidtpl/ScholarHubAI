import { BookOpen } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-[#070B14] text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1fr_auto] md:items-center lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-white">
            <BookOpen className="h-4 w-4 text-indigo-200" />
            <span className="font-serif font-semibold">ScholarHub</span>
          </div>
          <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">
            Preserving institutional scholarship and supporting open, responsible academic discovery.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-5 md:justify-end">
          <a href="https://owl.purdue.edu/owl/research_and_citation/resources.html" target="_blank" rel="noreferrer" className="transition hover:text-indigo-200">
            Citation ethics &amp; guidance
          </a>
          <span className="text-slate-600">&copy; {new Date().getFullYear()} ScholarHub. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
