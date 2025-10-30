from exchange_connector import ExchangeConnector
from models import Trade, Strategy, User, TradingMode, TradeStatus
from database import DBSession
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TradingEngine:
    """Core trading engine using CCXT via ExchangeConnector"""
    
    def __init__(self, user_id: int, exchange: str = 'gemini'):
        self.user_id = user_id
        self.exchange = exchange
        self.connector = ExchangeConnector(user_id, exchange)
    
    def execute_buy(self, symbol: str, amount: float, strategy_id: int = None, 
                    stop_loss_pct: float = None, take_profit_pct: float = None) -> dict:
        """Execute market buy order"""
        try:
            # Connect to exchange
            self.connector.connect()
            
            # Get current price
            ticker = self.connector.get_ticker(symbol)
            entry_price = ticker['last']
            
            # Execute market buy
            order = self.connector.create_market_buy(symbol, amount)
            
            # Calculate stop loss and take profit prices
            stop_loss = entry_price * (1 - stop_loss_pct / 100) if stop_loss_pct else None
            take_profit = entry_price * (1 + take_profit_pct / 100) if take_profit_pct else None
            
            # Record trade in database
            with DBSession() as db:
                trade = Trade(
                    user_id=self.user_id,
                    strategy_id=strategy_id,
                    exchange_order_id=order.get('id'),
                    trading_pair=symbol,
                    side='buy',
                    entry_price=entry_price,
                    entry_amount=amount,
                    entry_time=datetime.utcnow(),
                    trading_mode=TradingMode.LIVE,
                    status=TradeStatus.OPEN,
                    stop_loss=stop_loss,
                    take_profit=take_profit
                )
                db.add(trade)
                db.commit()
                db.refresh(trade)
                
                return {
                    'success': True,
                    'trade_id': trade.id,
                    'order': order,
                    'entry_price': entry_price,
                    'amount': amount,
                    'stop_loss': stop_loss,
                    'take_profit': take_profit
                }
        
        except Exception as e:
            logger.error(f"Buy order failed: {str(e)}")
            raise Exception(f"Failed to execute buy order: {str(e)}")
    
    def execute_sell(self, symbol: str, amount: float, trade_id: int = None) -> dict:
        """Execute market sell order and close position"""
        try:
            # Connect to exchange
            self.connector.connect()
            
            # Get current price
            ticker = self.connector.get_ticker(symbol)
            exit_price = ticker['last']
            
            # Execute market sell
            order = self.connector.create_market_sell(symbol, amount)
            
            # Update trade in database if trade_id provided
            if trade_id:
                with DBSession() as db:
                    trade = db.query(Trade).filter(
                        Trade.id == trade_id,
                        Trade.user_id == self.user_id
                    ).first()
                    
                    if trade:
                        trade.exit_price = exit_price
                        trade.exit_amount = amount
                        trade.exit_time = datetime.utcnow()
                        trade.status = TradeStatus.CLOSED
                        
                        # Calculate P&L
                        if trade.side == 'buy':
                            trade.profit_loss = (exit_price - trade.entry_price) * amount
                            trade.profit_loss_pct = ((exit_price - trade.entry_price) / trade.entry_price) * 100
                        
                        trade.exit_reason = 'manual_close'
                        db.commit()
            
            return {
                'success': True,
                'order': order,
                'exit_price': exit_price,
                'amount': amount
            }
        
        except Exception as e:
            logger.error(f"Sell order failed: {str(e)}")
            raise Exception(f"Failed to execute sell order: {str(e)}")
    
    def get_balance(self) -> dict:
        """Get account balance"""
        try:
            self.connector.connect()
            balance = self.connector.get_balance()
            return balance
        except Exception as e:
            logger.error(f"Failed to get balance: {str(e)}")
            raise Exception(f"Failed to get balance: {str(e)}")
    
    def get_open_positions(self) -> list:
        """Get all open positions for user"""
        try:
            with DBSession() as db:
                trades = db.query(Trade).filter(
                    Trade.user_id == self.user_id,
                    Trade.status == TradeStatus.OPEN,
                    Trade.trading_mode == TradingMode.LIVE
                ).all()
                
                positions = []
                for trade in trades:
                    # Get current price
                    try:
                        self.connector.connect()
                        ticker = self.connector.get_ticker(trade.trading_pair)
                        current_price = ticker['last']
                        
                        # Calculate unrealized P&L
                        if trade.side == 'buy':
                            unrealized_pnl = (current_price - trade.entry_price) * trade.entry_amount
                            unrealized_pnl_pct = ((current_price - trade.entry_price) / trade.entry_price) * 100
                        else:
                            unrealized_pnl = (trade.entry_price - current_price) * trade.entry_amount
                            unrealized_pnl_pct = ((trade.entry_price - current_price) / trade.entry_price) * 100
                        
                        positions.append({
                            'trade_id': trade.id,
                            'symbol': trade.trading_pair,
                            'side': trade.side,
                            'entry_price': trade.entry_price,
                            'current_price': current_price,
                            'amount': trade.entry_amount,
                            'unrealized_pnl': unrealized_pnl,
                            'unrealized_pnl_pct': unrealized_pnl_pct,
                            'stop_loss': trade.stop_loss,
                            'take_profit': trade.take_profit,
                            'entry_time': trade.entry_time.isoformat()
                        })
                    except:
                        # Skip if can't get current price
                        continue
                
                return positions
        
        except Exception as e:
            logger.error(f"Failed to get positions: {str(e)}")
            raise Exception(f"Failed to get positions: {str(e)}")
    
    def get_trade_history(self, limit: int = 50) -> list:
        """Get closed trade history"""
        try:
            with DBSession() as db:
                trades = db.query(Trade).filter(
                    Trade.user_id == self.user_id,
                    Trade.status == TradeStatus.CLOSED,
                    Trade.trading_mode == TradingMode.LIVE
                ).order_by(Trade.exit_time.desc()).limit(limit).all()
                
                history = []
                for trade in trades:
                    history.append({
                        'trade_id': trade.id,
                        'symbol': trade.trading_pair,
                        'side': trade.side,
                        'entry_price': trade.entry_price,
                        'exit_price': trade.exit_price,
                        'amount': trade.entry_amount,
                        'profit_loss': trade.profit_loss,
                        'profit_loss_pct': trade.profit_loss_pct,
                        'entry_time': trade.entry_time.isoformat(),
                        'exit_time': trade.exit_time.isoformat() if trade.exit_time else None,
                        'exit_reason': trade.exit_reason
                    })
                
                return history
        
        except Exception as e:
            logger.error(f"Failed to get trade history: {str(e)}")
            raise Exception(f"Failed to get trade history: {str(e)}")
    
    def check_stop_loss_take_profit(self, trade_id: int) -> dict:
        """Check if stop loss or take profit has been hit"""
        try:
            with DBSession() as db:
                trade = db.query(Trade).filter(
                    Trade.id == trade_id,
                    Trade.user_id == self.user_id,
                    Trade.status == TradeStatus.OPEN
                ).first()
                
                if not trade:
                    return {'action': 'none', 'reason': 'trade_not_found'}
                
                # Get current price
                self.connector.connect()
                ticker = self.connector.get_ticker(trade.trading_pair)
                current_price = ticker['last']
                
                # Check stop loss
                if trade.stop_loss and current_price <= trade.stop_loss:
                    return {
                        'action': 'close',
                        'reason': 'stop_loss_hit',
                        'current_price': current_price,
                        'trigger_price': trade.stop_loss
                    }
                
                # Check take profit
                if trade.take_profit and current_price >= trade.take_profit:
                    return {
                        'action': 'close',
                        'reason': 'take_profit_hit',
                        'current_price': current_price,
                        'trigger_price': trade.take_profit
                    }
                
                return {'action': 'none', 'reason': 'no_trigger'}
        
        except Exception as e:
            logger.error(f"Failed to check SL/TP: {str(e)}")
            return {'action': 'none', 'reason': 'error', 'error': str(e)}
    
    def close_position(self, trade_id: int, reason: str = 'manual') -> dict:
        """Close an open position"""
        try:
            with DBSession() as db:
                trade = db.query(Trade).filter(
                    Trade.id == trade_id,
                    Trade.user_id == self.user_id,
                    Trade.status == TradeStatus.OPEN
                ).first()
                
                if not trade:
                    raise Exception("Trade not found or already closed")
                
                # Execute sell order
                result = self.execute_sell(
                    symbol=trade.trading_pair,
                    amount=trade.entry_amount,
                    trade_id=trade_id
                )
                
                return result
        
        except Exception as e:
            logger.error(f"Failed to close position: {str(e)}")
            raise Exception(f"Failed to close position: {str(e)}")
