import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KPICardsProps {
  score: number;
  establishmentCount: number;
  population: number;
  medianIncome: number;
}

function KPICardsInner({ score, establishmentCount, population, medianIncome }: KPICardsProps) {
  const cards = [
    { title: 'Opportunity Score', value: score.toFixed(0), suffix: '/ 100' },
    { title: 'Establishments', value: establishmentCount.toLocaleString() },
    { title: 'Population', value: population.toLocaleString() },
    { title: 'Median Income', value: `$${medianIncome.toLocaleString()}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="kpi-cards">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <span className="text-xl font-bold">{card.value}</span>
            {card.suffix && (
              <span className="ml-1 text-xs text-muted-foreground">{card.suffix}</span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export const KPICards = React.memo(KPICardsInner);
