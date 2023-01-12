import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity()
export class Todo {
  @ObjectIdColumn()
  _id: ObjectID;

  @Column({ unique: true })
  title: string;

  @Column()
  completed: boolean;
  id: any;
}
