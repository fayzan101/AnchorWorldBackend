import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Hobby } from "../entities/Hobbies.entity";

export class HobbyRepository {
  private repository = AppDataSource.getRepository(Hobby);

  async create(name: string): Promise<Hobby> {
    const hobby = this.repository.create({ name });
    return await this.repository.save(hobby);
  }

  async findById(id: string): Promise<Hobby | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ["users"],
    });
  }

  async findByIds(ids: string[]): Promise<Hobby[]> {
    if (ids.length === 0) return [];
    return await this.repository.findBy({ id: In(ids) });
  }

  async findByName(name: string): Promise<Hobby | null> {
    return await this.repository
      .createQueryBuilder("hobby")
      .where("LOWER(hobby.name) = LOWER(:name)", { name: name.trim() })
      .getOne();
  }

  async findAll(): Promise<Hobby[]> {
    return await this.repository.find();
  }

  async update(id: string, name: string): Promise<Hobby | null> {
    await this.repository.update(id, { name });
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
