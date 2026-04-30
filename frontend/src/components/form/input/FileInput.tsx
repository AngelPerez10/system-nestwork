import { FC } from "react";

interface FileInputProps {
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileInput: FC<FileInputProps> = ({ className, onChange }) => {
  return (
    <input
      type="file"
      className={`h-11 w-full overflow-hidden rounded-xl border border-[#e2d9ca] bg-transparent text-sm text-gray-500 shadow-none transition-colors file:mr-5 file:border-collapse file:cursor-pointer file:rounded-l-lg file:border-0 file:border-r file:border-solid file:border-[#e2d9ca] file:bg-gray-50 file:py-3 file:pl-3.5 file:pr-3 file:text-sm file:text-gray-700 placeholder:text-gray-400 hover:file:bg-gray-100 focus:outline-hidden focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:file:border-[#334155] dark:file:bg-[#111a2b] dark:file:text-[#94a3b8] dark:placeholder:text-[#8ea0b8] ${className}`}
      onChange={onChange}
    />
  );
};

export default FileInput;
