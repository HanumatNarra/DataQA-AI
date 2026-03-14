import { notFound } from 'next/navigation';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ChartViewer } from '@/components/charts/ChartViewer';

interface ChartPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChartPage({ params }: ChartPageProps) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    notFound();
  }

  if (isNaN(id)) {
    notFound();
  }

  // Fetch the chart data
  const { data: chart, error: fetchError } = await supabase
    .from('chart_history')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !chart) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {chart.name || 'Chart View'}
          </h1>
          <p className="text-gray-600 mt-2">
            Created on {new Date(chart.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <ChartViewer chart={chart} />
      </div>
    </div>
  );
}
