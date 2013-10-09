import java.io.File;
import play.jobs.Job;
import play.jobs.OnApplicationStart;
import util.DatabaseInitializer;

@OnApplicationStart
public class Startup extends Job {
	
	public void doJob() {
		File sqlFile = new File("conf/create.sql");
		DatabaseInitializer.init(sqlFile);
	}
}