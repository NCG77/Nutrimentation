import { redirect } from 'next/navigation';

export const generateStaticParams = () => {
  return [];
};

export default function CatchAll() {
  redirect('/src/main_page');
}
