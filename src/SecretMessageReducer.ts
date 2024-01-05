import {
  AccountUpdate,
  Bool,
  Field,
  PublicKey,
  SmartContract,
  State,
  VerificationKey,
  method,
  state,
  Permissions,
  Account,
  UInt64,
  fetchAccount,
  Reducer,
  Struct,
  Poseidon,
  Gadgets,
  Provable,
  Circuit,
} from 'o1js';

class MessageInfo extends Struct({
  address: PublicKey,
  message: Field,
}) {
  constructor(value: { address: PublicKey; message: Field }) {
    super(value);
  }

  hash(): Field {
    return Poseidon.hash([
      this.address.x,
      this.address.isOdd.toField(),
      this.message,
    ]);
  }
}

export class SecretMessage extends SmartContract {
  @state(Field) public accountAdded = State<Field>();
  @state(Field) public messageAdded = State<Field>();

  reducer = Reducer({ actionType: MessageInfo });

  events = {
    'add-message': MessageInfo,
  };

  init() {
    super.init();

    const permissionToEdit = Permissions.proof();

    this.account.permissions.set({
      ...Permissions.default(),
      editState: permissionToEdit,
      setTokenSymbol: permissionToEdit,
      send: permissionToEdit,
      receive: permissionToEdit,
    });

    this.accountAdded.set(Field(0));
  }

  @method addAddress(address: PublicKey) {
    const currentState = this.accountAdded.getAndRequireEquals();
    currentState.assertLessThan(100);

    // this method will create an account for the address
    let account = Account(address, this.token.id);

    // need to be a new account
    account.isNew.getAndRequireEquals().assertTrue();

    this.accountAdded.set(currentState.add(1));
  }

  @method addMessage(message: Field) {
    let account = Account(this.sender, this.token.id);
    // need to be a existing account
    account.isNew.getAndRequireEquals().assertFalse();

    // flag check

    // If flag 1 is true, then all other flags must be false
    let flag1 = Field(0b111111);
    let flagAnd = Gadgets.and(message, flag1, 6);
    flagAnd.assertLessThanOrEqual(Field(0b100000));

    // If flag 2 is true, then flag 3 must also be true.
    let flag2 = Field(0b010000);
    let flag22 = Field(0b001000);
    let flag2check = Gadgets.and(message, flag2, 6);
    let flag2check2 = Gadgets.and(message, flag22, 6);

    let flag2Result = Provable.if<Bool>(
      flag2check.greaterThan(0),
      flag2check2.greaterThan(0),
      Bool(true)
    );

    flag2Result.assertTrue();

    // If flag 4 is true, then flags 5 and 6 must be false.
    let flag3 = Field(0b000111);
    let flag3Check = Gadgets.and(message, flag1, 6);
    flag3Check.assertLessThanOrEqual(Field(0b000100));

    let initial = {
      state: Bool(false),
      actionState: Reducer.initialActionState,
    };

    let stateType = Bool;
    let actions = this.reducer.getActions();

    let { state, actionState } = this.reducer.reduce(
      actions,
      stateType,
      (state: Bool, action: MessageInfo) =>
        state.or(action.address.equals(this.sender)),
      initial
    );

    // need to be the first time to add message for this address
    state.assertFalse();

    const messageInfo = new MessageInfo({ address: this.sender, message });
    this.reducer.dispatch(messageInfo);

    this.emitEvent('add-message', messageInfo);

    const currentState = this.messageAdded.getAndRequireEquals();
    this.messageAdded.set(currentState.add(1));
  }

  getMessage(address: PublicKey): Field {
    let actions = this.reducer.getActions();

    if (actions.length && actions[0].length) {
      for (let index = 0; index < actions.length; index++) {
        const elementX = actions[index];
        for (let indexY = 0; indexY < elementX.length; indexY++) {
          const elementY = elementX[indexY];
          if (elementY.address.equals(address)) {
            return elementY.message;
          }
        }
      }
    }

    return Field(0);
  }
}
