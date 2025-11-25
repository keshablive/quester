import { GamificationService } from '@/lib/services/gamification-service';

describe('GamificationService', () => {
  const userId = 'test-user-1';
  let service: GamificationService;

  beforeEach(async () => {
    service = new GamificationService();
    await service.resetUserMetrics(userId);
  });

  afterEach(async () => {
    await service.resetUserMetrics(userId);
  });

  it('initial metrics are zero and no badges', async () => {
    const metrics = await service.getMetrics(userId);
    expect(metrics.points).toBe(0);
    expect(metrics.badges).toEqual([]);
  });

  it('increments points correctly', async () => {
    await service.incrementPoints(userId, 10);
    let metrics = await service.getMetrics(userId);
    expect(metrics.points).toBe(10);

    await service.incrementPoints(userId, 5);
    metrics = await service.getMetrics(userId);
    expect(metrics.points).toBe(15);
  });

  it('awards badges and prevents duplicates', async () => {
    await service.awardBadge(userId, 'early-adopter');
    let metrics = await service.getMetrics(userId);
    expect(metrics.badges).toContain('early-adopter');

    // awarding again should not duplicate
    await service.awardBadge(userId, 'early-adopter');
    metrics = await service.getMetrics(userId);
    const occurrences = metrics.badges.filter(b => b === 'early-adopter').length;
    expect(occurrences).toBe(1);
  });
});
