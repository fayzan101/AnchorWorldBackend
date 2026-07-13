import { RelationshipGoalsRepository } from "../repositories/relationshipGoals.repository";

export class RelationShipGoalsService {
  private relationshipGoals: RelationshipGoalsRepository;
  constructor() {
    this.relationshipGoals = new RelationshipGoalsRepository();
  }

  async getAll() {
    return await this.relationshipGoals.findAll();
  }
}