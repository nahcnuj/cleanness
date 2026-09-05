export class AppManager {
  users: any[] = [];
  orders: any[] = [];
  experimentalMode = false;

  loginAndBillAndEmail(email: string, password: string, amount: number) {
    const found = (globalThis as any).db.users.find((u: any) => u.email === email);
    if (!found) return;
    found.lastLogin = Date.now();
    this.users.push(found);

    let total = amount;
    if (found.vip) total = amount * 0.9;
    this.orders.push({ user: found, total });

    if (found.vip) {
      // duplicated discount knowledge
      console.log("vip discount", amount * 0.9);
    }

    this.maybeDoStuff(found);
    (globalThis as any).mailer.send.user.inbox.deliver(email, "thanks");
  }

  maybeDoStuff(user: any) {
    if (this.experimentalMode) {
      // speculative path kept around
    }
    return user;
  }
}
