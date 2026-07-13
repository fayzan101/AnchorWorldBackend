import { AppDataSource } from "../config/database";
import { Circle } from "../entities/Circle.entity";
import { CircleMember, CircleMemberRole } from "../entities/CircleMember.entity";
import { EntityManager } from "typeorm";

export class CircleRepository {
  private circleRepo = () => AppDataSource.getRepository(Circle);
  private memberRepo = () => AppDataSource.getRepository(CircleMember);

  async findAll(): Promise<Circle[]> {
    return this.circleRepo().find({
      order: {
        is_featured: "DESC",
        member_count: "DESC",
        name: "ASC",
      },
    });
  }

  async findFeatured(limit = 5): Promise<Circle[]> {
    return this.circleRepo().find({
      where: { is_featured: true },
      order: {
        member_count: "DESC",
        name: "ASC",
      },
      take: limit,
    });
  }

  async findById(id: string): Promise<Circle | null> {
    return this.circleRepo().findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Circle | null> {
    return this.circleRepo().findOne({ where: { slug } });
  }

  async upsertBySlug(data: {
    name: string;
    slug: string;
    description: string;
    icon_url?: string | null;
    is_featured?: boolean;
  }): Promise<Circle> {
    const repo = this.circleRepo();
    let circle = await repo.findOne({ where: { slug: data.slug } });

    if (circle) {
      circle.name = data.name;
      circle.description = data.description;
      circle.icon_url = data.icon_url ?? circle.icon_url;
      circle.is_featured = data.is_featured ?? circle.is_featured;
      return repo.save(circle);
    }

    circle = repo.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon_url: data.icon_url ?? null,
      is_featured: data.is_featured ?? true,
      member_count: 0,
    });

    return repo.save(circle);
  }

  async getJoinedCircleIds(userId: string): Promise<Set<string>> {
    const memberships = await this.memberRepo().find({
      where: { user_id: userId },
      select: ["circle_id"],
    });
    return new Set(memberships.map((m) => m.circle_id));
  }

  async getUserCircles(userId: string): Promise<{ id: string; name: string }[]> {
    const memberships = await this.memberRepo().find({
      where: { user_id: userId },
      relations: ["circle"],
      order: { joined_at: "ASC" },
    });

    return memberships
      .filter((m) => m.circle)
      .map((m) => ({
        id: m.circle.id,
        name: m.circle.name,
      }));
  }

  async isMember(circleId: string, userId: string): Promise<boolean> {
    const count = await this.memberRepo().count({
      where: { circle_id: circleId, user_id: userId },
    });
    return count > 0;
  }

  async findMembership(
    circleId: string,
    userId: string
  ): Promise<CircleMember | null> {
    return this.memberRepo().findOne({
      where: { circle_id: circleId, user_id: userId },
    });
  }

  async joinCircle(
    circleId: string,
    userId: string,
    manager?: EntityManager
  ): Promise<CircleMember> {
    const memberRepository = manager
      ? manager.getRepository(CircleMember)
      : this.memberRepo();
    const circleRepository = manager
      ? manager.getRepository(Circle)
      : this.circleRepo();

    const member = memberRepository.create({
      circle_id: circleId,
      user_id: userId,
      role: CircleMemberRole.MEMBER,
    });
    const saved = await memberRepository.save(member);

    await circleRepository.increment({ id: circleId }, "member_count", 1);

    return saved;
  }

  async leaveCircle(circleId: string, userId: string): Promise<void> {
    const membership = await this.findMembership(circleId, userId);
    if (!membership) {
      return;
    }

    await this.memberRepo().remove(membership);

    const circle = await this.findById(circleId);
    if (circle && circle.member_count > 0) {
      await this.circleRepo().decrement({ id: circleId }, "member_count", 1);
    }
  }

  async getMembers(
    circleId: string,
    page: number,
    limit: number
  ): Promise<{ items: CircleMember[]; total: number }> {
    const [items, total] = await this.memberRepo().findAndCount({
      where: { circle_id: circleId },
      relations: ["user"],
      order: { joined_at: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }
}
