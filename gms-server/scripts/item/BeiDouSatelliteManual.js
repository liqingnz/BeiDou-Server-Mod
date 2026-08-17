/**北斗脚本

北斗之星-2430033

---By hanmburger*/
var status = -1;
var text;

function start() 
{
  status = -1;
  action(1, 0, 0);
}

function action(mode, type, selection)
{
	// temporary disable this script -- keep in sync with scripts-zh-CN/item/BeiDouSatelliteManual.js.
	// The loader falls back to this file per-file, so disabling only the zh-CN copy would leave
	// the 7-books-for-1M-mesos payout below reachable under en-US.
	im.dispose();
	// payout(mode);
}

function payout(mode)
{
	if (CheckStatus(mode))
	{
	    if (status == 0)
	    {
			//第一层对话
			if (im.haveItem(2430033, 7))
			{
				im.gainMeso(1000000);
				im.sendOk("This is a reward for you, take it.");
				im.gainItem(2430033,-7);
				im.dispose();
			}
			else
			{
				im.sendOk("More book is required.");
				im.dispose();
			}
	    }
		else
		{
			im.dispose();
		}
	}

}

function CheckStatus(mode)
{
	if (mode == -1)
	{
		cm.dispose();
		return false;
	}
	
	if (mode == 1)
	{
		status++;
	}
	else
	{
		status--;
	}
	
	if (status == -1)
	{
		cm.dispose();
		return false;
	}	
	return true;
}

