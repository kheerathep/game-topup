import React, { createContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { OrderItem } from '../types';
import { cartLineKey } from '../utils/cartLineKey';

interface CartState {
  items: OrderItem[];
}

export type CartAction =
  | { type: 'ADD_ITEM'; payload: OrderItem }
  /** ซื้อเลย: รวมแถวเดิมถ้า key เดียวกัน แล้วติ๊กชำระเฉพาะแถวนี้ (ปิดติ๊กแถวอื่น) */
  | { type: 'ADD_ITEM_PAY_SOLO'; payload: OrderItem }
  | { type: 'REMOVE_LINE'; payload: string }
  | { type: 'REMOVE_LINES'; payload: string[] }
  | { type: 'SET_LINE_QUANTITY'; payload: { lineId: string; quantity: number } }
  | { type: 'TOGGLE_CHECKOUT_SELECTED'; payload: string }
  | { type: 'SET_ALL_CHECKOUT_SELECTED'; payload: boolean }
  | { type: 'CLEAR_CART' };

const initialState: CartState = {
  items: [],
};

function withDefaultCheckoutSelected(item: OrderItem): OrderItem {
  return {
    ...item,
    checkout_selected: item.checkout_selected !== false,
  };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const incoming = withDefaultCheckoutSelected(action.payload);
      const addQty = incoming.quantity > 0 ? incoming.quantity : 1;
      const key = cartLineKey(incoming);
      const idx = state.items.findIndex((i) => cartLineKey(i) === key);
      if (idx >= 0) {
        const items = [...state.items];
        const cur = items[idx];
        items[idx] = {
          ...cur,
          quantity: cur.quantity + addQty,
        };
        return { ...state, items };
      }
      const id = incoming.id || crypto.randomUUID();
      return {
        ...state,
        items: [
          ...state.items,
          {
            ...incoming,
            id,
            quantity: addQty,
          },
        ],
      };
    }
    case 'ADD_ITEM_PAY_SOLO': {
      const incoming = withDefaultCheckoutSelected(action.payload);
      const addQty = incoming.quantity > 0 ? incoming.quantity : 1;
      const key = cartLineKey(incoming);
      const idx = state.items.findIndex((i) => cartLineKey(i) === key);
      if (idx >= 0) {
        const items = state.items.map((item) => ({ ...item, checkout_selected: false }));
        const cur = items[idx];
        items[idx] = {
          ...cur,
          quantity: cur.quantity + addQty,
          checkout_selected: true,
        };
        return { ...state, items };
      }
      const id = incoming.id || crypto.randomUUID();
      return {
        ...state,
        items: [
          ...state.items.map((item) => ({ ...item, checkout_selected: false })),
          {
            ...incoming,
            id,
            quantity: addQty,
            checkout_selected: true,
          },
        ],
      };
    }
    case 'REMOVE_LINE':
      return { ...state, items: state.items.filter((item) => item.id !== action.payload) };
    case 'REMOVE_LINES': {
      const drop = new Set(action.payload);
      return { ...state, items: state.items.filter((item) => !drop.has(item.id)) };
    }
    case 'SET_LINE_QUANTITY': {
      const { lineId, quantity } = action.payload;
      if (quantity <= 0) {
        return { ...state, items: state.items.filter((item) => item.id !== lineId) };
      }
      return {
        ...state,
        items: state.items.map((item) => (item.id === lineId ? { ...item, quantity } : item)),
      };
    }
    case 'TOGGLE_CHECKOUT_SELECTED':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload
            ? { ...item, checkout_selected: item.checkout_selected === false }
            : item,
        ),
      };
    case 'SET_ALL_CHECKOUT_SELECTED':
      return {
        ...state,
        items: state.items.map((item) => ({ ...item, checkout_selected: action.payload })),
      };
    case 'CLEAR_CART':
      return { items: [] };
    default:
      return state;
  }
}

export const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}

/** รายการที่ติ๊กชำระ */
export function isCheckoutLineSelected(item: OrderItem): boolean {
  return item.checkout_selected !== false;
}
