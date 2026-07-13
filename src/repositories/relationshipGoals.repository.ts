import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { RelationshipGoals } from "../entities/RelationshipGoals.entity";

export class RelationshipGoalsRepository {
  private repository = AppDataSource.getRepository(RelationshipGoals);

  async create(name: string): Promise<RelationshipGoals> {
    const hobby = this.repository.create({ name });
    return await this.repository.save(hobby);
  }

  async findById(id: string): Promise<RelationshipGoals | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ["users"],
    });
  }

  async findAll(): Promise<RelationshipGoals[]> {
    return await this.repository.find();
  }

  async findByIds(ids: string[]): Promise<RelationshipGoals[]> {
    return await this.repository.findBy({ id: In(ids) });
  }

  async update(id: string, name: string): Promise<RelationshipGoals | null> {
    await this.repository.update(id, { name });
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
