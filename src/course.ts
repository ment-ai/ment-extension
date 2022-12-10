import { Memento } from "vscode";
import { OpenAIManager } from "./openai";
import * as vscode from "vscode";
import { convertData, generateData, uuid } from "./utils";
import { MENT_AI_CONF_PATH_COURSE } from "./extension";
import { existsSync } from "fs";

export const CURRENT_GOAL_KEY = "ment-ai.currentGoal";
export const CURRENT_GOAL_FILE_KEY = "ment-ai.currentGoalFile";

class Solution {
  public content: string;
  public requested: boolean;
  public constructor(content: string, requested: boolean) {
    this.content = content;
    this.requested = requested;
  }
}

class Attempt {
  public content: string;
  public response: string;
  public constructor(content: string, response: string) {
    this.content = content;
    this.response = response;
  }
}

class Exercise {
  public content: string;
  public attempts: Attempt[] = [];
  public solutions: Solution[] = [];
  public constructor(content: string) {
    this.content = content;
  }
}

class Course {
  public goal: string;
  public exercises: Exercise[] = [];
  public static generate(goal: string) {
    return JSON.stringify({
      goal: goal,
      exercises: [],
    });
  }
  public constructor(json: string) {
    const data = JSON.parse(json);
    this.goal = data.goal;
    this.exercises = data.exercises;
  }
  public toString() {
    return JSON.stringify(this);
  }
  public getCurrExercise(): Exercise {
    return this.exercises[this.exercises.length - 1];
  }
  public updateCurrExercise(exercise: Exercise) {
    this.exercises[this.exercises.length] = exercise;
  }
}

export class CourseManager {
  private context: Memento;
  private fs: vscode.FileSystem;
  public course!: Course;

  public constructor(context: Memento, fs: vscode.FileSystem) {
    this.context = context;
    this.fs = fs;
  }

  public async startCourse(goal: string) {
    this.context.update(CURRENT_GOAL_KEY, goal);
    const courseGoalPath = vscode.Uri.parse(
      `${MENT_AI_CONF_PATH_COURSE}${goal.replaceAll(" ", "_")}.json`
    );
    this.context.update(CURRENT_GOAL_FILE_KEY, courseGoalPath);
    let fileData: string = "";
    if (existsSync(courseGoalPath.path)) {
      fileData = convertData(await this.fs.readFile(courseGoalPath));
    } else {
      fileData = Course.generate(goal);
      this.fs.writeFile(courseGoalPath, generateData(fileData));
    }
    this.course = new Course(fileData);
  }
  private async checkForCourse() {
    if (!this.course) {
      const goal: string = this.context.get(
        CURRENT_GOAL_KEY,
        `undefined-${uuid()}`
      );
      await this.startCourse(goal);
    }
  }
  public addExercise(content: string) {
    this.checkForCourse();
    this.course?.exercises.push(new Exercise(content));
  }
  public addExerciseAttempt(text: string, response: string) {
    this.checkForCourse();
    const exercise: Exercise = this.course?.getCurrExercise();
    exercise?.attempts.push(new Attempt(text, response));
  }
  public addExerciseSolution(content: string, requested: boolean) {
    this.checkForCourse();
    const exercise: Exercise = this.course?.getCurrExercise();
    exercise?.solutions.push(new Solution(content, requested));
    this.course?.updateCurrExercise(exercise);
  }
  public updateFile() {
    const courseGoalPath: vscode.Uri = this.context.get(
      CURRENT_GOAL_FILE_KEY,
      vscode.Uri.parse(`${MENT_AI_CONF_PATH_COURSE}/undefined-${uuid()}`)
    );
    this.fs.writeFile(courseGoalPath, generateData(this.course.toString()));
  }
}

/**
 * The idea for ExerciseBasedCourse would be to ask the student what goal (have list of predefined ones) he want to achieve:
 * - we create a complexe exercise that the student will start with.
 * - the student need to solve the exercise.
 *    - tools to help debug, understand and generate code are available at anytime.
 * - we should propose pre-written question to guide the student.
 */
export class ExerciseBasedCourse {
  private apiManager: OpenAIManager;
  private courseManager: CourseManager;

  public constructor(apiManager: OpenAIManager, courseManager: CourseManager) {
    this.apiManager = apiManager;
    this.courseManager = courseManager;
  }

  public async generateEntryExercise(goal: string) {
    this.courseManager.startCourse(goal);

    const response = await this.apiManager.request(
      `I want you to act as my personal teacher. You will generate small and hard exercises to help me reach my goal. You should not give me the solution in the first place, so I can try to solve them. In my future requests, I will specify the purpose of it by double parenthesis ((like this)). You should not use double parenthesis yourself. Here is my first goal: ${goal}`
    );

    this.courseManager.addExercise(response);
    this.courseManager.updateFile();
    return response;
  }
  public async generateNextExercise(difficulty: string) {
    const response = await this.apiManager.request(
      `((instruction)) next exercise, make it ${difficulty}`
    );
    this.courseManager.addExercise(response);
    this.courseManager.updateFile();
    return response;
  }

  public async answerExercise(text: string) {
    const response = await this.apiManager.request(`((answering)) ${text}`);
    this.courseManager.addExerciseAttempt(text, response);
    this.courseManager.updateFile();
    return response;
  }

  public async showSolutionExercise() {
    const response = await this.apiManager.request(`((show solution))`);
    this.courseManager.addExerciseSolution(response, true);
    this.courseManager.updateFile();
    return response;
  }
}
