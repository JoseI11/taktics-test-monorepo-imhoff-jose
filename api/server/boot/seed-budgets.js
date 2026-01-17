'use strict';

module.exports = function(app) {
  const Budget = app.models.Budget;
  if (!Budget) return;

  Budget.count(function(err, count) {
    if (err) return;
    if (count > 0) return; // no duplicar

    const demo = {
      name: 'Presupuesto Demo',
      thumbnail: 'https://example.com/img.png',
      date: new Date('2026-01-17T00:00:00.000Z'),
      clientName: 'ACME',
      chapters: [
        {
          rank: 1,
          description: 'Capítulo 1',
          saleCoefMaterial: 1.5,
          saleCoefLabour: 1.2,
          batches: [
            {
              rank: 1,
              description: 'Partida 1',
              amount: 2,
              materialCost: 100,
              labourCost: 50
            }
          ]
        }
      ]
    };

    Budget.create(demo, function(createErr) {
      if (createErr) {
        // opcional: console.error('Seed Budget error', createErr);
        return;
      }
      // opcional: console.log('Seed Budget created');
    });
  });
};
